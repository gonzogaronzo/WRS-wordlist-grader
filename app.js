/*
 * Client‑side logic for the WRS Word List Grading Tool.
 *
 * This script loads a structured JSON file containing the word lists
 * broken down by step, substep and list letter. It builds dynamic
 * drop‑downs for the teacher to select the appropriate list and
 * student, displays each word with an incorrect toggle and optional
 * notes field, and submits the results to a Google Sheet via a
 * configurable Apps Script endpoint.
 */

(() => {
  // Replace this URL with the URL of your published Google Apps Script
  // Web App. See the documentation in README.md for details on how
  // to create and deploy a script. Without a valid URL, the submit
  // button will simply log the collected data to the console.
  const POST_URL = 'YOUR_APPS_SCRIPT_WEBAPP_URL';

  let wordData = {};

  const stepSelect = document.getElementById('stepSelect');
  const substepSelect = document.getElementById('substepSelect');
  const listSelect = document.getElementById('listSelect');
  const studentSelect = document.getElementById('studentSelect');
  const wordListContainer = document.getElementById('wordListContainer');
  const submitButton = document.getElementById('submitButton');
  const messageEl = document.getElementById('message');

  // On DOM ready, load the JSON and initialise the interface
  document.addEventListener('DOMContentLoaded', () => {
    fetch('word_lists.json')
      .then(resp => resp.json())
      .then(data => {
        wordData = data;
        populateSteps();
      })
      .catch(err => {
        console.error('Error loading word lists:', err);
        messageEl.textContent = 'Failed to load word lists.';
      });
    populateStudents();
    stepSelect.addEventListener('change', onStepChange);
    substepSelect.addEventListener('change', onSubstepChange);
    listSelect.addEventListener('change', showWords);
    submitButton.addEventListener('click', submitData);
  });

  // Populate the step drop‑down based on keys in the JSON
  function populateSteps() {
    stepSelect.innerHTML = '<option value="">– Select Step –</option>';
    const steps = Object.keys(wordData).sort((a, b) => Number(a) - Number(b));
    steps.forEach(step => {
      const option = document.createElement('option');
      option.value = step;
      option.textContent = step;
      stepSelect.appendChild(option);
    });
    // Reset substeps and lists
    substepSelect.innerHTML = '<option value="">– Select Substep –</option>';
    listSelect.innerHTML = '<option value="">– Select List –</option>';
    wordListContainer.innerHTML = '';
  }

  // Populate the substep drop‑down whenever the step changes
  function onStepChange() {
    const step = stepSelect.value;
    substepSelect.innerHTML = '<option value="">– Select Substep –</option>';
    listSelect.innerHTML = '<option value="">– Select List –</option>';
    wordListContainer.innerHTML = '';
    if (!step || !wordData[step]) {
      return;
    }
    const substeps = Object.keys(wordData[step]).sort((a, b) => {
      // Sort by numeric portion then by decimal
      const [aMain, aSub] = a.split('.').map(Number);
      const [bMain, bSub] = b.split('.').map(Number);
      if (aMain === bMain) return aSub - bSub;
      return aMain - bMain;
    });
    substeps.forEach(ss => {
      const option = document.createElement('option');
      option.value = ss;
      option.textContent = ss;
      substepSelect.appendChild(option);
    });
  }

  // Populate the list drop‑down when the substep changes
  function onSubstepChange() {
    const step = stepSelect.value;
    const substep = substepSelect.value;
    listSelect.innerHTML = '<option value="">– Select List –</option>';
    wordListContainer.innerHTML = '';
    if (!step || !substep || !wordData[step] || !wordData[step][substep]) {
      return;
    }
    const lists = Object.keys(wordData[step][substep]).sort();
    lists.forEach(l => {
      const option = document.createElement('option');
      option.value = l;
      option.textContent = l || 'Main';
      listSelect.appendChild(option);
    });
  }

  // Display the selected word list on the page
  function showWords() {
    const step = stepSelect.value;
    const substep = substepSelect.value;
    const listId = listSelect.value;
    wordListContainer.innerHTML = '';
    messageEl.textContent = '';
    if (!step || !substep || !listId || !wordData[step] || !wordData[step][substep] || !wordData[step][substep][listId]) {
      return;
    }
    const words = wordData[step][substep][listId];
    words.forEach((word, idx) => {
      const row = document.createElement('div');
      row.className = 'word-row';
      // Word label
      const span = document.createElement('span');
      span.className = 'word-text';
      span.textContent = word;
      row.appendChild(span);
      // Checkbox for incorrect
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.id = `chk-${idx}`;
      chk.className = 'incorrect-checkbox';
      // Label for checkbox
      const chkLabel = document.createElement('label');
      chkLabel.htmlFor = chk.id;
      chkLabel.className = 'incorrect-label';
      chkLabel.textContent = 'Incorrect';
      // Notes input
      const notes = document.createElement('input');
      notes.type = 'text';
      notes.placeholder = 'Pronunciation (optional)';
      notes.className = 'notes-input';
      notes.disabled = true;
      // When checkbox toggles, enable or disable notes
      chk.addEventListener('change', () => {
        notes.disabled = !chk.checked;
        if (!chk.checked) {
          notes.value = '';
        }
      });
      row.appendChild(chk);
      row.appendChild(chkLabel);
      row.appendChild(notes);
      wordListContainer.appendChild(row);
    });
  }

  // Populate student IDs 1–30 by default; modify as needed
  function populateStudents() {
    studentSelect.innerHTML = '<option value="">– Select Student –</option>';
    for (let i = 1; i <= 30; i++) {
      const option = document.createElement('option');
      option.value = String(i).padStart(2, '0');
      option.textContent = String(i).padStart(2, '0');
      studentSelect.appendChild(option);
    }
  }

  // Gather the form data and submit it to the Apps Script
  function submitData() {
    const step = stepSelect.value;
    const substep = substepSelect.value;
    const listId = listSelect.value;
    const studentId = studentSelect.value;
    if (!step || !substep || !listId || !studentId) {
      messageEl.textContent = 'Please select a step, substep, list and student before submitting.';
      return;
    }
    // Gather word results
    const rows = wordListContainer.querySelectorAll('.word-row');
    const results = [];
    rows.forEach(row => {
      const word = row.querySelector('.word-text').textContent;
      const chk = row.querySelector('.incorrect-checkbox');
      const notes = row.querySelector('.notes-input');
      results.push({
        word,
        correct: !chk.checked,
        notes: notes.value.trim()
      });
    });
    const payload = {
      timestamp: new Date().toISOString(),
      step,
      substep,
      list_id: listId,
      student_id: studentId,
      word_list: results
    };
    submitButton.disabled = true;
    messageEl.textContent = 'Submitting…';
    // If POST_URL is not replaced, just log the payload
    if (!POST_URL || POST_URL === 'YOUR_APPS_SCRIPT_WEBAPP_URL') {
      console.log('Submission payload:', payload);
      messageEl.textContent = 'Data collected (see browser console). Please configure POST_URL to send to Google Sheets.';
      submitButton.disabled = false;
      return;
    }
    fetch(POST_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(() => {
        messageEl.textContent = 'Submission successful!';
      })
      .catch(err => {
        console.error(err);
        messageEl.textContent = 'An error occurred during submission.';
      })
      .finally(() => {
        submitButton.disabled = false;
      });
  }
})();