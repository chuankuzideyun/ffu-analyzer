import os
import json
import logging
import sqlite3
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import asynccontextmanager
from pathlib import Path

import pymupdf4llm
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
db = sqlite3.connect(Path(__file__).with_name("ffu.db"), check_same_thread=False)
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
data_dir = Path("data")

# Helper to add line numbers to markdown content
def add_line_numbers(text: str) -> str:
    lines = text.split('\n')
    # Prepend [Line Number] to every non-empty line
    numbered_lines = [f"[{i+1}] {line}" if line.strip() else line for i, line in enumerate(lines)]
    return '\n'.join(numbered_lines)

def extract_and_number(path: Path):
    raw_md = pymupdf4llm.to_markdown(str(path), ignore_images=True, ignore_graphics=True)
    return add_line_numbers(raw_md)

@asynccontextmanager
async def lifespan(app):
    db.execute("CREATE TABLE IF NOT EXISTS documents(id INTEGER PRIMARY KEY, filename TEXT, content TEXT)")
    db.commit()
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/process")
def process():
    logger.info("Processing documents with line numbering...")
    db.execute("DELETE FROM documents")
    db.commit()
    paths = sorted(data_dir.rglob("*.pdf"))
    
    with ThreadPoolExecutor(max_workers=8) as pool:
        # Use our new helper function here
        futures = {pool.submit(extract_and_number, path): path for path in paths}
        for future in as_completed(futures):
            path = futures[future]
            db.execute("INSERT INTO documents(filename, content) VALUES(?, ?)", (path.name, future.result()))
            db.commit()
            logger.info(f"Processed {path.name}")
    return {"status": "ok", "count": len(paths)}

@app.post("/chat")
def chat(body: dict):
    docs = db.execute("SELECT id, filename FROM documents ORDER BY id").fetchall()
    
    msg_content = "" 
    current_doc_content = ""
    # Updated System Prompt with strict citation rules
    system_content = (
        "You are a Swedish construction FFU analyst. "
        "When you provide a citation, you MUST use this format: [[doc_id#line_number#TYPE#quote_text]].\n"
        "TYPES allowed:\n"
        "- RISK: Safety, financial, or technical risks.\n"
        "- DEADLINE: Dates, milestones, or time limits.\n"
        "- REQ: Technical requirements or mandatory instructions.\n"
        "Example: 'The wall thickness is 200mm [[1#45#REQ#väggtjocklek 200mm]]'.\n"
        "Respond in English, but keep the 'quote_text' in its original language (Swedish)."
    )   
    
    system = {"role": "system", "content": system_content}
    messages = [system, *body.get("history", []), {"role": "user", "content": body.get("message", "")}]
    
    tools = [{
        "type": "function",
        "function": {
            "name": "read_document",
            "description": "Read one FFU document by database id. Content contains [Line Numbers].",
            "parameters": {
                "type": "object",
                "properties": {"document_id": {"type": "integer"}},
                "required": ["document_id"],
            },
        },
    }]

    try:
        for _ in range(10):
            resp = client.chat.completions.create(model="gpt-5.4", messages=messages, tools=tools, tool_choice="auto")
            msg = resp.choices[0].message
            msg_content = msg.content or ""
            if not msg.tool_calls:
                break
            messages.append(msg.model_dump(exclude_none=True))
            for call in msg.tool_calls:
                args = json.loads(call.function.arguments)
                doc_id = args["document_id"]
                row = db.execute("SELECT content FROM documents WHERE id = ?", (doc_id,)).fetchone()
                if row:
                    current_doc_content = row[0]
                # Context injection: Tell the model exactly which document it's looking at
                content_header = f"--- Content of Document ID {doc_id} ---\n"
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": content_header + (row[0] if row else "Document not found."),
                })
        return {
            "response": msg_content,
            "doc_content": current_doc_content 
        }
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": f"Error: {e}", "doc_content": ""}