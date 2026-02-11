import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from fastapi import UploadFile, File, Body, Header
from .classification_module import *
from .data_display_module import *  # Assuming classify.py is in the same directory
import io
import json
import os
import sys
from datetime import datetime
import uuid
from pathlib import Path

app = FastAPI()

origins = [
    "http://localhost:5123",
    "http://127.0.0.1:5123",
]

# In production (bundled app), we need to allow all origins since
# Electron loads from file:// protocol which sends "null" or no origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if getattr(sys, 'frozen', False) else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint for verifying backend is running
@app.get("/health")
def health_check():
    return {"status": "ok"}

# Determine data directory based on whether running frozen (bundled) or not
def get_data_dir():
    if getattr(sys, 'frozen', False):
        # Running as bundled app - use user's home directory for data
        data_dir = Path.home() / ".easyaccounting"
        data_dir.mkdir(exist_ok=True)
        return data_dir
    else:
        # Development mode - use current directory
        return Path(os.getcwd())

DATA_DIR = get_data_dir()

# File storage
STORAGE_FILE = str(DATA_DIR / "uploaded_files.json")
SESSIONS_FILE = str(DATA_DIR / "sessions.json")

def load_stored_files():
    if os.path.exists(STORAGE_FILE):
        with open(STORAGE_FILE, 'r') as f:
            return json.load(f)
    return []

def save_stored_files(files):
    with open(STORAGE_FILE, 'w') as f:
        json.dump(files, f, indent=2)

def find_file_by_id(stored_files, file_id):
    """Find a file by ID, searching both root level and inside folders.
    Returns tuple: (file_dict, parent_folder_or_none, is_in_folder)"""
    # Check root level first
    for item in stored_files:
        if item.get("type") != "folder" and item.get("id") == file_id:
            return (item, None, False)

    # Check inside folders
    for item in stored_files:
        if item.get("type") == "folder":
            for file in item.get("files", []):
                if file.get("id") == file_id:
                    return (file, item, True)

    return (None, None, False)

def load_sessions():
    if os.path.exists(SESSIONS_FILE):
        with open(SESSIONS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_sessions(sessions):
    with open(SESSIONS_FILE, 'w') as f:
        json.dump(sessions, f, indent=2)

def get_user_info_path():
    """Get the path to user_information.json, copying it to user data dir if needed."""
    import shutil
    HERE = Path(__file__).resolve().parent
    bundled_user_info = HERE / "user_information.json"

    if getattr(sys, 'frozen', False):
        user_info_path = DATA_DIR / "user_information.json"
        if not user_info_path.exists():
            shutil.copy(bundled_user_info, user_info_path)
        return user_info_path
    else:
        return bundled_user_info

def get_user_info():
    userinformation = get_user_info_path()
    with open(userinformation, "r") as f:
        data = json.load(f)
        # Handle both array and object format
        if isinstance(data, list):
            return data[0] if len(data) > 0 else {}
        return data

def save_user_info(user_data):
    userinformation = get_user_info_path()
    with open(userinformation, "w") as f:
        json.dump([user_data], f, indent=2)

@app.post("/uploadcsv")
async def upload_csv(file: UploadFile = File(...)):
    content = await file.read()
    headers = ['date', 'activity', 'expense', 'income', 'total']
    df = pd.read_csv(io.StringIO(content.decode("utf-8")), names=headers)

    df = df.replace([float('inf'), float('-inf')], None)
    df = df.fillna(0)  # Replace NaN with None (valid in JSON)
    df, remaning_classifications = classify(df)
    
    # Calculate totals
    total_expense = df['expense'].sum()
    total_income = df['income'].sum()
    total_records = len(df)
    
    # Create file record
    file_id = str(uuid.uuid4())
    file_record = {
        "id": file_id,
        "filename": file.filename,
        "uploadDate": datetime.now().isoformat(),
        "totalRecords": total_records,
        "totalExpense": float(total_expense),
        "totalIncome": float(total_income),
        "data": df.to_dict(orient="records")
    }
    
    # Store the file
    stored_files = load_stored_files()
    stored_files.append(file_record)
    save_stored_files(stored_files)
    
    if remaning_classifications == []:
        parsed_data = df.to_dict(orient="records")
        return {"parsed": parsed_data, "fileId": file_id}
    else:
        parsed_data = df.to_dict(orient="records")
        return {"rem_class": remaning_classifications, "parsed": parsed_data, "fileId": file_id}

@app.get("/stored-files")
def get_stored_files():
    files = load_stored_files()
    # Return both files and folders with their metadata
    result = []
    for item in files:
        if 'type' in item and item['type'] == 'folder':
            # Return folder metadata
            result.append({
                "id": item["id"],
                "type": "folder",
                "name": item["name"],
                "createdDate": item["createdDate"],
                "files": item["files"]  # Include the files array
            })
        else:
            # Return file metadata
            result.append({
                "id": item["id"],
                "filename": item["filename"],
                "uploadDate": item["uploadDate"],
                "totalRecords": item["totalRecords"],
                "totalExpense": item["totalExpense"],
                "totalIncome": item["totalIncome"]
            })
    return result

@app.get("/file-data/{file_id}")
def get_file_data(file_id: str):
    stored_files = load_stored_files()
    file, _, _ = find_file_by_id(stored_files, file_id)
    if file:
        return {"data": file["data"]}
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/folder-data/{folder_id}")
def get_folder_data(folder_id: str):
    """Get aggregated data from all files in a folder"""
    stored_files = load_stored_files()

    # Find the folder
    folder = None
    for item in stored_files:
        if item.get("type") == "folder" and item.get("id") == folder_id:
            folder = item
            break

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Aggregate data from all files in the folder
    aggregated_data = []
    for file in folder.get("files", []):
        if "data" in file:
            aggregated_data.extend(file["data"])

    return {
        "data": aggregated_data,
        "folderName": folder.get("name"),
        "fileCount": len(folder.get("files", []))
    }

@app.delete("/file/{file_id}")
def delete_file(file_id: str):
    stored_files = load_stored_files()
    file, parent_folder, is_in_folder = find_file_by_id(stored_files, file_id)

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if is_in_folder and parent_folder:
        # Remove from folder's files array
        parent_folder["files"] = [f for f in parent_folder["files"] if f["id"] != file_id]
    else:
        # Remove from root level
        stored_files = [f for f in stored_files if f["id"] != file_id]

    save_stored_files(stored_files)
    return {"message": "File deleted successfully"}

@app.post("/reclassify")
async def reclassify(parsed: list = Body(...)):
    df = pd.DataFrame(parsed)
    df, _ = classify(df)  # This will use the updated JSON files
    parsed_data = df.to_dict(orient="records")
    return {"parsed": parsed_data}

@app.post("/update-file-data/{file_id}")
async def update_file_data(file_id: str, data: list = Body(...)):
    """Update the stored data for a file after reclassification"""
    stored_files = load_stored_files()
    file, _, _ = find_file_by_id(stored_files, file_id)

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    file["data"] = data
    # Recalculate totals
    df = pd.DataFrame(data)
    file["totalExpense"] = float(df['expense'].sum())
    file["totalIncome"] = float(df['income'].sum())
    file["totalRecords"] = len(df)
    save_stored_files(stored_files)
    return {"message": "File data updated successfully"}

@app.post("/addnewvalue")
async def add_new_activity_post(
    classification: str = Body(...), 
    activity: str = Body(...),
):
    addnewValue(classification,activity)
    print("new expense added")
    return {
        "message": "Expense added successfully",
        "classification": classification
    }

@app.post("/addnewclassification")
async def add_new_classification(
    new_classification: str = Body(...), 
    selected_activity: str = Body(...),
    chosen_type: str = Body(...)
):
    addnewClassification(classification=new_classification,activity=selected_activity,type=chosen_type)
    return{
        "message": "Classification added succesfully"
    }


@app.get("/expense-options")
def get_expense_classification_options():
    import json
    HERE = Path(__file__).resolve().parent  # .../backend/app
    expenses = HERE / "expense_classification.json"
    with open(expenses, "r") as f:
        expense_data = json.load(f)
    options = [item["classification"] for item in expense_data]
    print("expense options selected")
    return {"options": sorted(options)}

@app.get("/income-options")
def get_income_classification_options():
    import json
    HERE = Path(__file__).resolve().parent 
    incomes = HERE/ "income_classification.json"
    with open(incomes, "r") as f:
        income_data = json.load(f)
    options = [item["classification"] for item in income_data]
    print("income options selected")
    return {"options": sorted(options)}


@app.post("/pivot-table")
def sum_classifications(classifications: List = Body(...)):
    summed_classifications = create_summed_classifications(classifications)
    return summed_classifications

@app.post("/create-folder")
def create_folder(folder_data: dict = Body(...)):
    folder_name = folder_data.get("folder_name")
    if not folder_name:
        raise HTTPException(status_code=400, detail="Folder name is required")

    stored_files = load_stored_files()

    # Check if folder already exists
    for file in stored_files:
        if file.get("type") == "folder" and file.get("name") == folder_name:
            raise HTTPException(status_code=400, detail="Folder already exists")
    
    folder_id = str(uuid.uuid4())
    folder_record = {
        "id": folder_id,
        "type": "folder",
        "name": folder_name,
        "createdDate": datetime.now().isoformat(),
        "files": []
    }
    
    stored_files.append(folder_record)
    save_stored_files(stored_files)
    return {"message": "Folder created successfully", "folderId": folder_id}

@app.get("/debug-stored")
def debug_stored_files():
    """Debug endpoint to see what's actually stored"""
    files = load_stored_files()
    return {"files": files, "count": len(files)}

@app.post("/rename-file")
def rename_file(file_id: str = Body(...), new_name: str = Body(...)):
    stored_files = load_stored_files()
    file, _, _ = find_file_by_id(stored_files, file_id)

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    file["filename"] = new_name
    save_stored_files(stored_files)
    return {"message": "File renamed successfully"}

@app.post("/move-file")
def move_file(file_id: str = Body(...), folder_id: str = Body(...)):
    stored_files = load_stored_files()

    # Find the file and folder
    file_to_move = None
    target_folder = None

    for file in stored_files:
        if file["id"] == file_id:
            file_to_move = file
        elif file["id"] == folder_id and file.get("type") == "folder":
            target_folder = file

    if not file_to_move:
        raise HTTPException(status_code=404, detail="File not found")
    if not target_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Remove file from current location
    stored_files = [f for f in stored_files if f["id"] != file_id]
    
    # Add file to folder
    target_folder["files"].append(file_to_move)
    
    save_stored_files(stored_files)
    return {"message": "File moved successfully"}

@app.delete("/folder/{folder_id}")
def delete_folder(folder_id: str, delete_contents: bool = False):
    stored_files = load_stored_files()

    # Find the folder
    folder = None
    for f in stored_files:
        if f["id"] == folder_id and f.get("type") == "folder":
            folder = f
            break

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Check if folder has files and delete_contents is False
    if folder.get("files") and len(folder["files"]) > 0 and not delete_contents:
        raise HTTPException(status_code=400, detail="Folder contains files. Set delete_contents to true to delete folder and its contents.")

    # Delete the folder
    stored_files = [f for f in stored_files if f["id"] != folder_id]
    save_stored_files(stored_files)
    return {"message": "Folder deleted successfully"}

# ==================== AUTH ENDPOINTS ====================

class LoginRequest(BaseModel):
    entered_password: str
    entered_name: str

class ChangeUsernameRequest(BaseModel):
    new_username: str
    current_password: str

class ChangePasswordRequest(BaseModel):
    new_password: str
    current_password: str

@app.post("/api/auth/login")
def login(request: LoginRequest):
    """Login endpoint - validates credentials and returns session token"""
    user = get_user_info()

    # Check credentials
    if (user.get("User Name") == request.entered_name and
        user.get("Password") == request.entered_password):
        # Generate session token
        token = str(uuid.uuid4())

        # Store session
        sessions = load_sessions()
        sessions[token] = {
            "username": user.get("User Name"),
            "created_at": datetime.now().isoformat()
        }
        save_sessions(sessions)

        return {
            "ok": True,
            "token": token,
            "user": {
                "name": user.get("User Name")
            }
        }

    return {"ok": False, "message": "Invalid credentials"}

@app.post("/api/auth/check")
def check_auth(request: LoginRequest):
    """Legacy endpoint for backward compatibility"""
    user = get_user_info()

    if (user.get("User Name") == request.entered_name and
        user.get("Password") == request.entered_password):
        return {"ok": True, "user": {"name": user.get("User Name")}}

    return {"ok": False}

@app.get("/api/auth/me")
def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current user info from session token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace("Bearer ", "")
    sessions = load_sessions()

    if token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")

    session = sessions[token]
    return {
        "ok": True,
        "user": {
            "name": session["username"]
        }
    }

@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    """Logout endpoint - invalidates session token"""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        sessions = load_sessions()

        if token in sessions:
            del sessions[token]
            save_sessions(sessions)

    return {"ok": True, "message": "Logged out successfully"}

@app.post("/api/auth/change-username")
def change_username(request: ChangeUsernameRequest, authorization: Optional[str] = Header(None)):
    """Change username endpoint"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace("Bearer ", "")
    sessions = load_sessions()

    if token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")

    user = get_user_info()

    # Verify current password
    if user.get("Password") != request.current_password:
        raise HTTPException(status_code=403, detail="Incorrect password")

    # Update username
    user["User Name"] = request.new_username
    save_user_info(user)

    # Update session
    sessions[token]["username"] = request.new_username
    save_sessions(sessions)

    return {"ok": True, "message": "Username updated successfully", "user": {"name": request.new_username}}

@app.post("/api/auth/change-password")
def change_password(request: ChangePasswordRequest, authorization: Optional[str] = Header(None)):
    """Change password endpoint"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace("Bearer ", "")
    sessions = load_sessions()

    if token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")

    user = get_user_info()

    # Verify current password
    if user.get("Password") != request.current_password:
        raise HTTPException(status_code=403, detail="Incorrect password")

    # Update password
    user["Password"] = request.new_password
    save_user_info(user)

    return {"ok": True, "message": "Password updated successfully"}



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

