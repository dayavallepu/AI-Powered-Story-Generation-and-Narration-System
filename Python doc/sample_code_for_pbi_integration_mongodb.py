from pymongo import MongoClient
import pandas as pd
# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["storygen_db"]
# Example: Load feedback collection
collection = db["feedback_collection"]
data = list(collection.find())
df = pd.DataFrame(data)
# Clean up and export to CSV
df.drop(columns=["_id"], inplace=True, errors="ignore")
df.to_csv("feedback_data.csv", index=False)
