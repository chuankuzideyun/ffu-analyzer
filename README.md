# FFU Analyzer - Swedish Construction Assistant

**Deployed Application:** [https://ffu-analyzer.vercel.app/](https://ffu-analyzer.vercel.app/)

---

## Project Overview

### What I built
I developed a specialized AI assistant for the Swedish construction industry to analyze **FFU (Förfrågningsunderlag)** documents. 
* **Precise Citation System:** The AI links answers directly to source text using a `[[doc_id#line#TYPE#quote]]` format.
* **Dual Pane:** A professional interface with a searchable Document Viewer and a categorized Chat Assistant.
* **Clear Dashboard:** An automated overview summarizing **Risks, Deadlines, and Requirements**.
* **Multi-modal Support:** Support for **mobile camera capture** to analyze on-site photos against document specifications.

### Why I chose to build it
I chose this because:
* **To ensure Accountability:** Manual cross-referencing is prone to error. I add the **Precise Citation** function so every AI claim is verifiable.
* **To improve Navigation Efficiency:** FFU documents are dense. I implemented the **Dual-Pane UI and Dashboard** to allow users to instantly scan for high-priority risks without reading hundreds of pages.
* **To bridge the Field-to-Office Gap:** There is often a disconnect between the site and the contract. By adding **Multi-modal Support**, I enable site managers to verify physical installations against technical requirements in real-time, preventing costly rework.

### What I would do next

* **On-Hover Citation Preview:** Implement a feature where hovering over a citation shows a mini-popover of source text, making the links between the chat and the document clearer.
* **Persistent Highlighting:** Mark identified **Requirements**, **Risks**, and **Deadlines** with different background colors directly in the Document Viewer for instant visual scanning.

* **Automatic Report Generation:** Add a button to export all identified risks and deadlines from the FFU into a professional PDF or Excel report.
* **Language Switching:** Allow users to switch the Assistant's response language between **English** and **Swedish**.
* **Dark Mode:** Implement a dark mode to reduce eye strain in office environments.

* **Blueprint Cross-referencing:** Train the Vision AI to cross-reference a site photo not just against the text FFU, but also against **CAD/Blueprints (e.g., .dwg/.dxf)** to verify dimensions and placement.

---

## Getting Started (Local Development)

**Requirements:** Python 3.12+ and Node 24+.

1. **Setup Environment:**
   Put your OpenAI API key in `backend/.env`:
   ```env
   OPENAI_API_KEY=your-key-here
   ```

2. **Prepare Data:**
Unzip the FFU files into backend/data. (Note: The repository also includes a pre-indexed ffu.db for immediate testing).

3. **Start the Backend:**

```env
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

4. **Start the Frontend:**
In a second terminal:

```env
cd frontend
npm install
npm run dev
```

5. **Access:**
Open http://localhost:5173, click Process FFU (if database is empty), and start chatting.

## Deployment Info
Frontend: Vercel

Backend: Railway

Database: SQLite (Pre-indexed ffu.db included in repository)

## Application Interface
<img width="1804" height="957" alt="image" src="https://github.com/user-attachments/assets/904aaadd-4536-471b-9ff2-d3a475d829f3" />
