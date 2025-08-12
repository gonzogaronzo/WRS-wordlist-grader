# Wilson Reading System® Word List Grading Tool

This repository contains a lightweight, browser‑based grading tool for the
Wilson Reading System® (WRS) word lists.  It is designed to help teachers
assess students on the fly and record their performance directly to a
Google Sheet without any installation or backend server.

## Features

* **Runs entirely in the browser** – host on GitHub Pages, Google Sites or
  any static web host.  No installation or server required.
* **Step/Substep/List/Student selectors** – quickly choose the lesson and
  student by number (students are referenced by ID rather than name).
* **Auto‑loading of word lists** – lists are stored in
  [`word_lists.json`](./word_lists.json) and organised by step and substep.  You
  can add or update lists without touching the code.
* **Teacher‑friendly interface** – each word is shown with a single
  “Incorrect” toggle; if toggled, a notes field appears to record how the
  student pronounced the word.  Correct words require no action.
* **Google Sheets integration** – submissions are sent via a Google Apps
  Script Web App directly into your spreadsheet.  Each word is recorded on
  its own row with date/time, step, substep, list, student ID, score and
  notes.

## Getting Started

1. **Clone or download** this repository and navigate into the `wrs_app`
   directory.  The application consists of static files (`index.html`,
   `style.css`, `app.js` and `word_lists.json`).

2. **Serve locally** for testing.  You can use any static file server.
   For example with Node.js installed:

   ```bash
   npx http-server wrs_app
   ```

   Then open <http://localhost:8080> in your browser.

3. **Configure the Google Apps Script endpoint**.  By default
   `app.js` contains a placeholder `POST_URL` constant (`YOUR_APPS_SCRIPT_WEBAPP_URL`).
   Replace this string with the URL of your published Apps Script.  See
   below for instructions on creating the script.

4. **Deploy** by uploading the contents of `wrs_app` to your preferred static
   hosting service (e.g. a GitHub repository configured with GitHub Pages
   enabled).  You can also create a new Google Site and embed the application
   within an iframe pointing to your GitHub Pages URL.

## Setting Up the Google Sheet and Apps Script

1. **Create a new Google Sheet**.  Give it a meaningful name, e.g.
   `WRS Assessments`.  Optionally rename the first sheet to `Data`.

2. **Open the Apps Script editor** from the sheet by selecting
   **Extensions → Apps Script**.  Delete any boilerplate code.

3. **Paste the following script** into the editor.  Replace
   `YOUR_SHEET_ID` with the ID of your spreadsheet (found in the URL after
   `/d/`).  This script appends one row per word with the fields described
   earlier.

   ```js
   function doPost(e) {
     var ss = SpreadsheetApp.openById('YOUR_SHEET_ID');
     var sheet = ss.getSheetByName('Data') || ss.getSheets()[0];
     var data = JSON.parse(e.postData.contents);
     var rows = [];
     data.word_list.forEach(function(item) {
       rows.push([
         new Date(data.timestamp),
         data.step,
         data.substep,
         data.list_id,
         data.student_id,
         item.word,
         item.correct ? 'Correct' : 'Incorrect',
         item.notes || ''
       ]);
     });
     sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
     return ContentService.createTextOutput('OK');
   }
   ```

4. **Save and deploy** the script as a Web App.  Click **Deploy → New
   deployment** (or “Manage deployments” if you’ve deployed before).  Choose
   **Web App** as the deployment type, select **`Anyone`** as the access level
   so that the application can post without requiring sign‑in, and click
   **Deploy**.  Copy the resulting Web App URL and paste it into `POST_URL`
   in `app.js`.

5. **Test the integration**.  Load your grading tool, complete a sample
   assessment and click **Submit**.  The data should appear in your Google
   Sheet almost immediately.  If you encounter CORS issues, ensure that your
   script’s permissions allow anonymous access and that you’ve copied the
   correct URL (ending with `/exec`).

## Adding or Updating Word Lists

All of the available word lists are stored in the JSON file
[`word_lists.json`](./word_lists.json).  The file is organised as a
three‑level object: top‑level keys are the **step numbers** (`"1"` through
`"12"`), each containing an object keyed by **substep** (e.g. `"1.3"`),
which in turn contains an object keyed by **list ID** (e.g. `"A"`,
`"B"`, etc.).  Each list ID maps to an array of words.  An example
structure looks like this:

```json
{
  "2": {
    "2.3": {
      "A": ["pyramid", "copper", "vinyl", …],
      "B": [...],
      "C": [...]
    },
    "2.4": {
      "A": [...]
    }
  },
  "3": {
    "3.1": {
      "A": [...]
    }
  }
}
```

To **add a new list**:

1. Open `word_lists.json` in a text editor.
2. Locate the step and substep where the new list belongs.  If the step or
   substep does not exist, add it as a new object.
3. Add a new property corresponding to the list ID (e.g. `"G"`) and set
   its value to an array of lowercase words.
4. Save the file and redeploy your site.  The new list will automatically
   appear in the drop‑down.

If you have the official Word List documents as `.docx` files, you can
generate a new `word_lists.json` using the `extract_word_lists.py`
utility we used to build the initial dataset.  In short, it parses each
`.docx` to extract words and organises them by file name.  See
`/home/oai/share` in this repository for a working example.

## Resetting or Backing Up the Google Sheet

Your Google Sheet serves as the permanent record of student assessments.
To **backup** the data, simply make a copy of the sheet within Google
Drive (`File → Make a copy`).  To **reset** the sheet while keeping the
Apps Script intact, open the sheet and delete all rows except for the
header row.  Ensure that your script continues to append new rows at the
bottom.

## Deploying Updates

Whenever you modify `word_lists.json`, `app.js`, `style.css` or any other
part of the application, you’ll need to redeploy.  If you host on GitHub
Pages, commit and push your changes to the branch configured for Pages
(e.g. `gh-pages`) and GitHub will update the site automatically within a
few minutes.  For other hosts, upload the updated files.

## License

This project is provided for educational use and is not affiliated with or
endorsed by Wilson Language Training Corporation.  Use at your own risk.