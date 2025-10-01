// Initialize jsPDF
const { jsPDF } = window.jspdf;

// DOM Elements
const scriptForm = document.getElementById('scriptForm');
const characterCountInput = document.getElementById('characterCount');
const generateCharacterFieldsBtn = document.getElementById('generateCharacterFields');
const characterFieldsDiv = document.getElementById('characterFields');
const characterButtonsDiv = document.getElementById('characterButtons');
const dialogueSectionDiv = document.getElementById('dialogueSection');
const scriptPreviewDiv = document.getElementById('scriptPreview');
const savedScriptsListDiv = document.getElementById('savedScriptsList');
const downloadPDFBtn = document.getElementById('downloadPDF');
const resetFormBtn = document.getElementById('resetForm');

// State variables
let currentScript = {
    id: null,
    movieName: '',
    scenario: '',
    characters: [],
    dialogues: []
};
let savedScripts = JSON.parse(localStorage.getItem('movieScripts')) || [];

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    loadSavedScripts();
    updatePreview();
});

generateCharacterFieldsBtn.addEventListener('click', generateCharacterFields);
scriptForm.addEventListener('submit', saveScript);
resetFormBtn.addEventListener('click', resetForm);
downloadPDFBtn.addEventListener('click', downloadPDF);

// Functions
function generateCharacterFields() {
    const characterCount = parseInt(characterCountInput.value);
    characterFieldsDiv.innerHTML = '';
    
    for (let i = 0; i < characterCount; i++) {
        const characterDiv = document.createElement('div');
        characterDiv.className = 'mb-3';
        characterDiv.innerHTML = `
            <label for="character${i}" class="form-label">Character ${i+1} Name</label>
            <input type="text" class="form-control character-name" id="character${i}" required>
        `;
        characterFieldsDiv.appendChild(characterDiv);
    }
    
    // Add event listeners to character name inputs
    const characterInputs = document.querySelectorAll('.character-name');
    characterInputs.forEach(input => {
        input.addEventListener('input', function() {
            generateCharacterButtons();
            updatePreview();
        });
    });
    
    // Generate character buttons for dialogue
    generateCharacterButtons();
}

function generateCharacterButtons() {
    characterButtonsDiv.innerHTML = '';
    const characterInputs = document.querySelectorAll('.character-name');
    
    characterInputs.forEach((input, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-primary character-btn';
        button.textContent = `Add ${input.value || `Character ${index+1}`} Dialogue`;
        button.dataset.characterIndex = index;
        button.addEventListener('click', function() {
            addDialogueEntry(index);
        });
        characterButtonsDiv.appendChild(button);
    });
}

function addDialogueEntry(characterIndex) {
    const characterInputs = document.querySelectorAll('.character-name');
    const characterName = characterInputs[characterIndex].value || `Character ${characterIndex+1}`;
    
    const dialogueEntry = document.createElement('div');
    dialogueEntry.className = 'dialogue-entry';
    dialogueEntry.innerHTML = `
        <div class="mb-2">
            <span class="character-name">${characterName}:</span>
        </div>
        <div class="mb-2">
            <textarea class="form-control dialogue-text" placeholder="Enter dialogue..." rows="3"></textarea>
        </div>
        <div class="text-end">
            <button type="button" class="btn btn-sm btn-danger remove-dialogue">Remove</button>
        </div>
    `;
    
    dialogueSectionDiv.appendChild(dialogueEntry);
    
    // Add event listener to remove button
    dialogueEntry.querySelector('.remove-dialogue').addEventListener('click', function() {
        dialogueEntry.remove();
        updatePreview();
    });
    
    // Update preview when dialogue is added or modified
    dialogueEntry.querySelector('.dialogue-text').addEventListener('input', updatePreview);
    
    updatePreview();
}

function updatePreview() {
    const movieName = document.getElementById('movieName').value;
    const scenario = document.getElementById('scenario').value;
    const characterInputs = document.querySelectorAll('.character-name');
    const dialogueEntries = document.querySelectorAll('.dialogue-entry');
    
    let previewHTML = '';
    
    if (movieName) {
        previewHTML += `<h3 class="text-center mb-3">${movieName}</h3>`;
    }
    
    if (scenario) {
        previewHTML += `<h5>Scenario</h5><p>${scenario.replace(/\n/g, '<br>')}</p><hr>`;
    }
    
    if (characterInputs.length > 0) {
        const hasCharacters = Array.from(characterInputs).some(input => input.value.trim() !== '');
        if (hasCharacters) {
            previewHTML += `<h5>Characters</h5><ul>`;
            characterInputs.forEach(input => {
                if (input.value.trim()) {
                    previewHTML += `<li>${input.value}</li>`;
                }
            });
            previewHTML += `</ul><hr>`;
        }
    }
    
    if (dialogueEntries.length > 0) {
        const hasDialogues = Array.from(dialogueEntries).some(entry => 
            entry.querySelector('.dialogue-text').value.trim() !== ''
        );
        
        if (hasDialogues) {
            previewHTML += `<h5>Dialogues</h5>`;
            dialogueEntries.forEach(entry => {
                const characterName = entry.querySelector('.character-name').textContent.replace(':', '');
                const dialogueText = entry.querySelector('.dialogue-text').value;
                
                if (dialogueText.trim()) {
                    previewHTML += `<p><strong>${characterName}:</strong> ${dialogueText.replace(/\n/g, '<br>')}</p>`;
                }
            });
        }
    }
    
    if (!previewHTML) {
        previewHTML = '<p class="text-muted">Your script preview will appear here...</p>';
        downloadPDFBtn.disabled = true;
    } else {
        downloadPDFBtn.disabled = false;
    }
    
    scriptPreviewDiv.innerHTML = previewHTML;
}

function saveScript(e) {
    e.preventDefault();
    
    // Get form data
    const movieName = document.getElementById('movieName').value;
    const scenario = document.getElementById('scenario').value;
    const characterInputs = document.querySelectorAll('.character-name');
    const dialogueEntries = document.querySelectorAll('.dialogue-entry');
    
    // Validate required fields
    if (!movieName.trim() || !scenario.trim()) {
        alert('Please fill in all required fields: Movie Name and Scenario');
        return;
    }
    
    // Collect characters
    const characters = [];
    characterInputs.forEach(input => {
        if (input.value.trim()) {
            characters.push(input.value.trim());
        }
    });
    
    // Collect dialogues
    const dialogues = [];
    dialogueEntries.forEach(entry => {
        const characterName = entry.querySelector('.character-name').textContent.replace(':', '');
        const dialogueText = entry.querySelector('.dialogue-text').value.trim();
        
        if (dialogueText) {
            dialogues.push({
                character: characterName,
                text: dialogueText
            });
        }
    });
    
    // Create script object
    const script = {
        id: currentScript.id || Date.now().toString(),
        movieName: movieName.trim(),
        scenario: scenario.trim(),
        characters: characters,
        dialogues: dialogues,
        lastModified: new Date().toISOString()
    };
    
    // Save to localStorage
    if (currentScript.id) {
        // Update existing script
        const index = savedScripts.findIndex(s => s.id === currentScript.id);
        if (index !== -1) {
            savedScripts[index] = script;
        }
    } else {
        // Add new script
        savedScripts.push(script);
    }
    
    localStorage.setItem('movieScripts', JSON.stringify(savedScripts));
    
    // Reset form and reload saved scripts
    resetForm();
    loadSavedScripts();
    
    alert('Script saved successfully!');
}

function loadSavedScripts() {
    savedScriptsListDiv.innerHTML = '';
    
    if (savedScripts.length === 0) {
        savedScriptsListDiv.innerHTML = '<p class="text-muted">No saved scripts yet. Create your first script!</p>';
        return;
    }
    
    savedScripts.forEach(script => {
        const scriptItem = document.createElement('div');
        scriptItem.className = 'script-item';
        scriptItem.innerHTML = `
            <h5>${script.movieName}</h5>
            <p class="mb-1"><strong>Characters:</strong> ${script.characters.join(', ')}</p>
            <p class="mb-2 text-muted small">Last modified: ${new Date(script.lastModified).toLocaleString()}</p>
            <div class="action-buttons">
                <button type="button" class="btn btn-sm btn-primary view-script" data-id="${script.id}">View/Edit</button>
                <button type="button" class="btn btn-sm btn-danger delete-script" data-id="${script.id}">Delete</button>
            </div>
        `;
        
        savedScriptsListDiv.appendChild(scriptItem);
    });
    
    // Add event listeners to view/edit buttons
    document.querySelectorAll('.view-script').forEach(button => {
        button.addEventListener('click', function() {
            const scriptId = this.dataset.id;
            loadScriptForEditing(scriptId);
        });
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-script').forEach(button => {
        button.addEventListener('click', function() {
            const scriptId = this.dataset.id;
            deleteScript(scriptId);
        });
    });
}

function loadScriptForEditing(scriptId) {
    const script = savedScripts.find(s => s.id === scriptId);
    if (!script) return;
    
    // Set current script
    currentScript = { ...script };
    
    // Populate form fields
    document.getElementById('movieName').value = script.movieName;
    document.getElementById('scenario').value = script.scenario;
    document.getElementById('characterCount').value = script.characters.length;
    
    // Generate character fields
    generateCharacterFields();
    
    // Populate character names
    const characterInputs = document.querySelectorAll('.character-name');
    script.characters.forEach((character, index) => {
        if (characterInputs[index]) {
            characterInputs[index].value = character;
        }
    });
    
    // Regenerate character buttons
    generateCharacterButtons();
    
    // Clear and populate dialogues
    dialogueSectionDiv.innerHTML = '';
    script.dialogues.forEach(dialogue => {
        const characterIndex = script.characters.findIndex(c => c === dialogue.character);
        if (characterIndex !== -1) {
            // Create dialogue entry without triggering the button click
            const characterInputs = document.querySelectorAll('.character-name');
            const characterName = characterInputs[characterIndex].value || `Character ${characterIndex+1}`;
            
            const dialogueEntry = document.createElement('div');
            dialogueEntry.className = 'dialogue-entry';
            dialogueEntry.innerHTML = `
                <div class="mb-2">
                    <span class="character-name">${characterName}:</span>
                </div>
                <div class="mb-2">
                    <textarea class="form-control dialogue-text" placeholder="Enter dialogue..." rows="3">${dialogue.text}</textarea>
                </div>
                <div class="text-end">
                    <button type="button" class="btn btn-sm btn-danger remove-dialogue">Remove</button>
                </div>
            `;
            
            dialogueSectionDiv.appendChild(dialogueEntry);
            
            // Add event listener to remove button
            dialogueEntry.querySelector('.remove-dialogue').addEventListener('click', function() {
                dialogueEntry.remove();
                updatePreview();
            });
            
            // Update preview when dialogue is modified
            dialogueEntry.querySelector('.dialogue-text').addEventListener('input', updatePreview);
        }
    });
    
    // Update preview
    updatePreview();
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function deleteScript(scriptId) {
    if (confirm('Are you sure you want to delete this script?')) {
        savedScripts = savedScripts.filter(s => s.id !== scriptId);
        localStorage.setItem('movieScripts', JSON.stringify(savedScripts));
        
        // If we're currently editing the deleted script, reset the form
        if (currentScript.id === scriptId) {
            resetForm();
        }
        
        loadSavedScripts();
    }
}

function resetForm() {
    scriptForm.reset();
    characterFieldsDiv.innerHTML = '';
    characterButtonsDiv.innerHTML = '';
    dialogueSectionDiv.innerHTML = '';
    scriptPreviewDiv.innerHTML = '<p class="text-muted">Your script preview will appear here...</p>';
    downloadPDFBtn.disabled = true;
    currentScript = {
        id: null,
        movieName: '',
        scenario: '',
        characters: [],
        dialogues: []
    };
}

function downloadPDF() {
    const movieName = document.getElementById('movieName').value || 'Untitled Script';
    const scenario = document.getElementById('scenario').value;
    const characterInputs = document.querySelectorAll('.character-name');
    const dialogueEntries = document.querySelectorAll('.dialogue-entry');
    
    // Create new PDF document
    const doc = new jsPDF();
    
    // Set initial position
    let yPosition = 20;
    
    // Add movie title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(movieName, 105, yPosition, { align: 'center' });
    yPosition += 15;
    
    // Add scenario
    if (scenario) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('SCENARIO', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        const scenarioLines = doc.splitTextToSize(scenario, 170);
        doc.text(scenarioLines, 20, yPosition);
        yPosition += scenarioLines.length * 7 + 10;
    }
    
    // Add characters
    const hasCharacters = Array.from(characterInputs).some(input => input.value.trim() !== '');
    if (hasCharacters) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('CHARACTERS', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        characterInputs.forEach(input => {
            if (input.value.trim()) {
                // Check if we need a new page
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(`• ${input.value}`, 25, yPosition);
                yPosition += 7;
            }
        });
        yPosition += 5;
    }
    
    // Add dialogues
    const hasDialogues = Array.from(dialogueEntries).some(entry => 
        entry.querySelector('.dialogue-text').value.trim() !== ''
    );
    
    if (hasDialogues) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('DIALOGUES', 20, yPosition);
        yPosition += 15;
        
        dialogueEntries.forEach(entry => {
            const characterName = entry.querySelector('.character-name').textContent.replace(':', '');
            const dialogueText = entry.querySelector('.dialogue-text').value.trim();
            
            if (dialogueText) {
                // Check if we need a new page
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                // Add character name
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(`${characterName.toUpperCase()}:`, 20, yPosition);
                yPosition += 7;
                
                // Add dialogue text
                doc.setFont(undefined, 'normal');
                const dialogueLines = doc.splitTextToSize(dialogueText, 170);
                doc.text(dialogueLines, 25, yPosition);
                yPosition += dialogueLines.length * 7 + 10;
            }
        });
    }
    
    // Save the PDF
    doc.save(`${movieName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_script.pdf`);
}
