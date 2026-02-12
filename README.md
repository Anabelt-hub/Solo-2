Netlify URL

https://collection2.netlify.app

Backend language used

Python (Flask)

Explanation of JSON persistence

All records are stored on the server in a JSON file: collection_api/data/records.json.
The Flask backend reads this file to return data (GET) and writes back to the same file after every Create/Update/Delete request, so changes persist across browser refreshes, incognito mode, and different devices.https://collection2.netlify.app
