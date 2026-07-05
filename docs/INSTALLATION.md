# INSTALLATION GUIDE

This guide provides step-by-step instructions to install, build, and run the complete AegisRoute Platform locally on your workstation.

---

## Prerequisite Software Configurations

To run the complete full-stack application (frontend, backend, and dashboards), confirm your workstation meets the following minimum prerequisites:

*   **Node.js**: `v18.x` or higher (utilizing `npm v9.x` or higher).
*   **Python**: `v3.10` or higher (to run FastAPI backend and Streamlit).
*   **CUDA Driver (Optional for Local GPU Recalcs)**: NVIDIA CUDA `v12.x` and a compatible NVIDIA GPU (such as RTX 30/40 series, A10G, or L4). If a local GPU is missing, the backend automatically cascades to a multi-threaded CPU Pandas fallback engine seamlessly.

---

## 1. Frontend Client Installation & Startup

The primary user interface is built on React 18, Vite, and Tailwind CSS.

### Step 1: Navigate to the Workspace Root
Open your shell terminal in the project's root folder:
```bash
cd aegisroute-platform
```

### Step 2: Install Node Packages
Install all required UI and development packages declared in `package.json`:
```bash
npm install
```

### Step 3: Set Up Client Environment Configuration
Create a local `.env` configuration file to point the client to your server gateways:
```bash
cp .env.example .env
```
Ensure the client's API address points to the backend server (defaulting to port `3000` under our reverse-proxy context, or port `8000` for a standalone python server).

### Step 4: Run the UI Development Server
Launch the local Vite server:
```bash
npm run dev
```
The React frontend is now accessible at **`http://localhost:3000`**.

---

## 2. Python Backend Services Installation & Startup

The backend is built using Python's FastAPI framework and hosts the high-throughput pipelines.

### Step 1: Navigate to the Backend Folder
```bash
cd backend
```

### Step 2: Provision a Virtual Environment
Create and activate an isolated Python environment:
```bash
# On Linux and macOS:
python -m venv venv
source venv/bin/activate

# On Windows:
python -m venv venv
.\venv\Scripts\activate
```

### Step 3: Install Required Dependencies
Install the required packages, including FastAPI, the Google GenAI SDK, and Plotly:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note on cuDF Installations**: If you have a local CUDA-compatible environment, you can install NVIDIA's RAPIDS libraries via the official package index:
> ```bash
> pip install --extra-index-url=https://pypi.nvidia.com cudf-cu12==24.04.*
> ```

### Step 4: Configure Backend Environment Variables
Create a local `.env` file in the backend directory:
```bash
cp .env.example .env
```
Open `.env` and configure your API key:
```env
# /backend/.env
GEMINI_API_KEY=your_google_gemini_api_key_goes_here
PORT=8000
HOST=0.0.0.0
```

### Step 5: Start the FastAPI Server
Run the FastAPI backend with hot-reloading:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API is now running and documented at **`http://localhost:8000/docs`**.

---

## 3. Streamlit Portal Startup

To launch the high-density executive dashboard built with Streamlit:

### Step 1: Ensure Backend Virtual Env is Active
Make sure you are still within the virtual environment where your python dependencies were installed.

### Step 2: Start Streamlit
Run the Streamlit application from inside the `/backend` folder:
```bash
streamlit run streamlit_app.py --server.port 8501 --server.address 0.0.0.0
```
The Streamlit Executive Portal is now active at **`http://localhost:8501`**.

---

## 4. Run Automated Validation Suites (Full Stack Verification)

Verify that your local installation is fully operational by executing the React and Express testing suites:

```bash
# Return to root directory
cd ..

# Run the TypeScript validation suites
npm run test
```
This command runs the integrated tests, confirming that unit code models, route controllers, performance speedups, and role clearances are 100% compliant.
