import spacy
from pymongo import MongoClient
import classy_classification
import os

nlp = spacy.load("en_core_web_md")
data = {}

uri = f"redacted"
client = MongoClient(uri)
db = client["test"]
complaintsDB = db["complaints"]
sortedcomplaintsDB = db["sortedcomplaints"]


keys_folder = "mysite/keys"
for filename in os.listdir(keys_folder):
    with open(os.path.join(keys_folder, filename)) as f:
        key = os.path.splitext(filename)[0]
        data[key] = f.read().split("\n")

nlp = spacy.blank("en")
nlp.add_pipe(
    "classy_classification",
    config={
        "data": data,
        "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        "device": "cpu"
    }
)

def getLabel(text):
    doc = nlp(text)
    cats = doc._.cats
    highest_key = max(cats, key=cats.get)
    return highest_key

crs = complaintsDB.find()

for cr in crs:
    newcrs = cr.copy()
    newcrs["label"] = getLabel(cr["description"])
    newcrs.pop("_id", None)

    sortedcomplaintsDB.insert_one(newcrs)
    print(newcrs["title"], "catagorized into", newcrs["label"])
    complaintsDB.delete_one({"_id": cr["_id"]})