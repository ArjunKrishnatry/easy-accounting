import pandas as pd
from pathlib import Path
import json
import sys
import shutil

def get_classification_paths():
    """Get the paths to classification files, copying them to user data dir if needed."""
    HERE = Path(__file__).resolve().parent  # .../backend/app (or _internal/app when frozen)
    bundled_expenses = HERE / "expense_classification.json"
    bundled_incomes = HERE / "income_classification.json"

    if getattr(sys, 'frozen', False):
        # Running as bundled app - use user's home directory for data
        data_dir = Path.home() / ".easyaccounting"
        data_dir.mkdir(exist_ok=True)

        user_expenses = data_dir / "expense_classification.json"
        user_incomes = data_dir / "income_classification.json"

        # Copy files on first run if they don't exist in user data dir
        if not user_expenses.exists():
            shutil.copy(bundled_expenses, user_expenses)
        if not user_incomes.exists():
            shutil.copy(bundled_incomes, user_incomes)

        return user_expenses, user_incomes
    else:
        # Development mode - use files in the app directory
        return bundled_expenses, bundled_incomes

def classify(df):
    # Load classification data from JSON
    expenses, incomes = get_classification_paths()

    with open(expenses, "r") as f:
        expense_data = json.load(f)
    with open(incomes, "r") as f:
        income_data = json.load(f)

    # Build lookup dictionaries from classification files
    expense_classification_map = {
        item["classification"]: [kw.lower() for kw in item["expenses_attributed"]]
        for item in expense_data
    }
    income_classification_map = {
        item["classification"]: [kw.lower() for kw in item["income_attributed"]]
        for item in income_data
    }

    remaining_classifications = []
    df["classification"] = "No classification"

    for idx, row in df.iterrows():
        activity = str(row["activity"]).lower()
        matched = False

        # Check if the row has expense or income and classify accordingly
        if float(row["expense"]) > 0:
            for category, keywords in expense_classification_map.items():
                for keyword in keywords:
                    if keyword == activity :
                        print(f"Category: {category}, Activity: {activity}")
                        df.at[idx, "classification"] = category
                        matched = True
                        break
            if not matched:
                row_dict = row.to_dict()
                row_dict['idx'] = idx
                remaining_classifications.append(row_dict)

        elif float(row["income"]) > 0:
            for category, keywords in income_classification_map.items():
                for keyword in keywords:
                    if keyword == activity :
                        print(f"Category: {category}, Activity: {activity}")
                        df.at[idx, "classification"] = category
                        matched = True
                        break
            if not matched:
                row_dict = row.to_dict()
                row_dict['idx'] = idx
                remaining_classifications.append(row_dict)

    df["expense"] = pd.to_numeric(df["expense"], errors='coerce').fillna(0)
    df["income"] = pd.to_numeric(df["income"], errors='coerce').fillna(0)
    df = df.sort_values(by="classification")
    print(remaining_classifications)
    
    return df, remaining_classifications

def addnewValue(classification, activity):
    # Load classification data from JSON
    expenses, incomes = get_classification_paths()

    print(classification[:1])
    if classification[:2] == "IN":
        with open(incomes, "r") as f:
            data = json.load(f)
        # Find the block and add the expense
        for block in data:
            print(block["classification"])
            if block["classification"] == classification:
                print(block["classification"], classification)
                if activity not in block["income_attributed"]:
                    block["income_attributed"].append(activity)
                break

        with open(incomes, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
    else:
        with open(expenses, "r") as f:
            data = json.load(f)
        for block in data:
            print(block["classification"])
            if block["classification"] == classification:
                print(block["classification"], classification)
                if activity not in block["expenses_attributed"]:
                    block["expenses_attributed"].append(activity)
                break
        
        with open(expenses, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)

def addnewClassification(classification, activity, type):
    expenses, incomes = get_classification_paths()

    if type == "income":
        with open(incomes, "r") as f:
            data = json.load(f)
        
        # Find the next available number for income classifications
        existing_numbers = []
        for item in data:
            if item["classification"].startswith("IN: "):
                try:
                    # Extract number from "IN: XX - Classification"
                    num_part = item["classification"].split(" - ")[0].split("IN: ")[1]
                    if num_part.isdigit():
                        existing_numbers.append(int(num_part))
                except:
                    continue
        
        # Find the next available number
        next_number = 1
        if existing_numbers:
            next_number = max(existing_numbers) + 1
        
        # Format the new classification name
        new_classification_name = f"IN: {next_number:02d} - {classification}"
        
        new_block = {"classification": new_classification_name, "income_attributed": [activity]}
        data.append(new_block)

        with open(incomes, "w") as f:
            json.dump(data, f, indent=4)
    else:
        with open(expenses, "r") as f:
            data = json.load(f)
        
        # Find the next available number for expense classifications
        existing_numbers = []
        for item in data:
            try:
                # Extract number from "XX - Classification" or "XXA - Classification"
                num_part = item["classification"].split(" - ")[0]
                if num_part.isdigit():
                    existing_numbers.append(int(num_part))
                elif len(num_part) > 2 and num_part[:-1].isdigit() and num_part[-1].isalpha():
                    # Handle cases like "05A" - extract "05"
                    existing_numbers.append(int(num_part[:-1]))
            except:
                continue
        
        # Find the next available number
        next_number = 1
        if existing_numbers:
            next_number = max(existing_numbers) + 1
        
        # Format the new classification name
        new_classification_name = f"{next_number:02d} - {classification}"
        
        new_block = {"classification": new_classification_name, "expenses_attributed": [activity]}
        data.append(new_block)

        with open(expenses, "w") as f:
            json.dump(data, f, indent=4)


