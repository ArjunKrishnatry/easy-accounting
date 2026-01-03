import json

def create_summed_classifications(data):
    with open("expense_classification.json", "r") as f:
        expense_data = json.load(f)
    with open("income_classification.json", "r") as f:
        income_data = json.load(f)

    # Build a unified map of classifications with initial totals of 0
    classification_totals = {}

    for item in expense_data:
        classification_totals[item["classification"]] = {"expense": 0, "income": 0}
        

    for item in income_data:
        if item["classification"] not in classification_totals:
            classification_totals[item["classification"]] = {"expense": 0, "income": 0}

    # Process each row in the data
    for row in data:
        expense = float(row[2]) if row[2] else 0
        income = float(row[3]) if row[3] else 0
        classification = row[4].strip()

        if classification in classification_totals:
            if expense > 0:
                classification_totals[classification]["expense"] += expense
            if income > 0:
                classification_totals[classification]["income"] += income

    # Convert to list of tuples: (classification, expense_sum, income_sum)
    # Only include classifications that have non-zero values
    tupled_classifications = []
    for classification, totals in classification_totals.items():
        if totals["expense"] > 0 or totals["income"] > 0:
            tupled_classifications.append((classification, totals["expense"], totals["income"]))

    return tupled_classifications