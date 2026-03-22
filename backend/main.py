import os
import json
import logging
import sqlite3
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import asynccontextmanager

import pymupdf4llm
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
db = sqlite3.connect(Path(__file__).with_name("ffu.db"), check_same_thread=False)
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
data_dir = Path("data")
data_dir.mkdir(exist_ok=True)

def add_line_numbers(text: str) -> str:
    lines = text.split('\n')
    numbered_lines = [f"[{i+1}] {line}" if line.strip() else line for i, line in enumerate(lines)]
    return '\n'.join(numbered_lines)

def extract_and_number(path: Path):
    raw_md = pymupdf4llm.to_markdown(str(path), ignore_images=True, ignore_graphics=True)
    return add_line_numbers(raw_md)

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.execute("CREATE TABLE IF NOT EXISTS documents(id INTEGER PRIMARY KEY, filename TEXT, content TEXT)")
    db.commit()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online"}

@app.post("/api/process")
def process():
    db.execute("DELETE FROM documents")
    db.commit()
    paths = sorted(data_dir.rglob("*.pdf"))
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(extract_and_number, path): path for path in paths}
        for future in as_completed(futures):
            path = futures[future]
            db.execute("INSERT INTO documents(filename, content) VALUES(?, ?)", (path.name, future.result()))
            db.commit()
    return {"status": "ok", "count": len(paths)}

@app.post("/api/chat")
def chat(body: dict = Body(...)):
    user_text = body.get("message", "Analyze this.")
    image_b64 = body.get("image", "")
    user_content = [{"type": "text", "text": user_text}]
    if image_b64:
        user_content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}})

    msg_content = "" 
    current_doc_content = ""
    system_content = (
        "You are a Swedish construction FFU analyst. "
        "When you provide a citation, you MUST use this format: [[doc_id#line_number#TYPE#quote_text]]. "
        "TYPES: RISK, DEADLINE, REQ. Respond in English, keep quote_text in Swedish."
    )   
    
    messages = [
        {"role": "system", "content": system_content},
        *body.get("history", []),
        {"role": "user", "content": user_content}
    ]
    
    tools = [{
        "type": "function",
        "function": {
            "name": "read_document",
            "description": "Read document by ID",
            "parameters": {
                "type": "object",
                "properties": {"document_id": {"type": "integer"}},
                "required": ["document_id"],
            },
        },
    }]

    try:
        resp = client.chat.completions.create(
            model="gpt-4o", 
            messages=messages, 
            tools=tools
        )
        for _ in range(5):
            resp = client.chat.completions.create(model="gpt-4o", messages=messages, tools=tools)
            msg = resp.choices[0].message
            if not msg.tool_calls:
                msg_content = msg.content or ""
                break
            
            messages.append(msg.model_dump(exclude_none=True))
            for call in msg.tool_calls:
                args = json.loads(call.function.arguments)
                row = db.execute("SELECT content FROM documents WHERE id = ?", (args["document_id"],)).fetchone()
                res_content = row[0] if row else "Not found."
                if row: current_doc_content = row[0]
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": res_content,
                })
        
        return {"response": msg_content, "doc_content": current_doc_content}
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"response": str(e), "doc_content": ""}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
