let fileSystem = {};
let currentDir = {};
let path = [];
let commandHistory = [];  // Store the history of commands
let historyIndex = -1;    // Track the current index in the history
let currentPathStr = "root/";

const SCRIPT_ID = "AKfycbySXRl7MJL4aYfaEX5rd9Y-c6FSAl3dsEtJ22mkhrRLj5-Im7VRFIdkDHGWi2aMSVWMAQ";
const FOLDER_ID = "138LS_NKFaTZIlDcujQbNJEo_X_b4z77y";

const consoleElement = document.getElementById("console");
const commandInput = document.getElementById("command-input");
const prompt = document.getElementById("prompt");

prompt.innerHTML = `${currentPathStr}$ `;

let loadingAnimationInterval = null; // Store the interval for loading animation

// Update console with new output
function updateConsole(output, type) {
  const div = document.createElement("div");
  div.textContent = output;
  div.classList.add(type);
  consoleElement.appendChild(div);
  consoleElement.scrollTop = consoleElement.scrollHeight;
}

// Function to start loading animation
function startLoading() {
  commandInput.disabled = true;
  let i = 0;
  const animations = ["|", "/", "-", "\\"];
  loadingAnimationInterval = setInterval(() => {
    prompt.innerHTML = `${currentPathStr}$ ${animations[i]}`;
    i = (i + 1) % animations.length;
  }, 250);
}

// Function to stop loading animation
function stopLoading() {
  clearInterval(loadingAnimationInterval);
  prompt.innerHTML = `${currentPathStr}$ `;
  commandInput.disabled = false;
}

// Parse user commands
function parseCommand(command) {
  const [cmd, ...args] = command.split(" ");
  switch (cmd) {
    case "ls":
      if (typeof currentDir === 'object') {
        updateConsole(Object.keys(currentDir).join(" "), "content");
      } else {
        updateConsole("Not a directory", "error");
      }
      break;
    case "cd":
      if (args[0] && currentDir[args[0]]) {
        path.push(args[0]);
        currentDir = currentDir[args[0]];
        currentPathStr = path.join("/");
        prompt.innerText = `${currentPathStr}$ `;
      } else if (args[0] === "..") {
        if (path.length > 1) {
          path.pop();
          currentDir = path.reduce((acc, dir) => acc[dir], fileSystem);
          currentPathStr = path.join("/");
          prompt.innerText = `${currentPathStr}$ `;
        }
      } else {
        updateConsole("Directory not found", "error");
      }
      break;

    case "cat":
      if (args[0] && typeof currentDir[args[0]]["id"] && currentDir[args[0]]["content"] === "") {
        startLoading();
        fetch(`https://script.google.com/macros/s/${SCRIPT_ID}/exec?action=getContent&fileId=${currentDir[args[0]]["id"]}`, {})
            .then(response => response.json())
            .then(data => {
              currentDir[args[0]]["content"] = data["content"];
              updateConsole(currentDir[args[0]]["content"], "content");
              stopLoading();
            })
            .catch(error => {
              updateConsole("Error loading file content", "error");
              console.error(error);
              stopLoading();
            });
      } else if (args[0] && currentDir[args[0]]["content"]) {
        updateConsole(currentDir[args[0]]["content"], "content");
      } else {
        updateConsole("File not found", "error");
      }
      break;
    case "mkdir":
      if (args[0]) {
        if (!currentDir[args[0]]) {
          currentDir[args[0]] = {}; // Create a new directory
          updateConsole(`Directory '${args[0]}' created.`, "success");
        } else {
          updateConsole(`Directory '${args[0]}' already exists.`, "error");
        }
      } else {
        updateConsole("Please specify a directory name.", "error");
      }
      break;
    case "touch":
      if (args[0]) {
        if (!currentDir[args[0]]) {
          currentDir[args[0]] = ""; // Create an empty file
          updateConsole(`File '${args[0]}' created.`, "success");
        } else {
          updateConsole(`File '${args[0]}' already exists.`, "error");
        }
      } else {
        updateConsole("Please specify a file name.", "error");
      }
      break;
    case "help":
      updateConsole("Commands: ls, cd [dir], cat [file], mkdir [dir], touch [file], help", "message");
      break;
    case "clear":
      consoleElement.innerHTML = "";
      break;
    default:
      updateConsole("Unknown command", "error");
  }
}

// Load the file system from JSON
function loadFileSystem() {
  startLoading();
  fetch(`https://script.google.com/macros/s/${SCRIPT_ID}/exec?action=getStructure&folderId=${FOLDER_ID}`)
      .then(response => response.json())
      .then(data => {
        fileSystem = data; // Сохраняем всю структуру
        currentDir = fileSystem["root"]; // Начинаем с "root"
        path = ["root"]; // Устанавливаем начальный путь
        updateConsole("File system loaded!", "success");
        stopLoading();
      })
      .catch(error => {
        updateConsole("Error loading file system: " + error, "error")
        stopLoading();
      });
}

// Handle keydown events for command input
commandInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const command = commandInput.value;
    if (command.trim()) {
      updateConsole(`${currentPathStr}$ ${command}`, "message");
      console.log(currentPathStr);
      prompt.innerText = `${currentPathStr}$ `;
      parseCommand(command);
      commandHistory.push(command); // Store the command in history
      historyIndex = commandHistory.length; // Reset the history index
    }
    commandInput.value = ""; // Clear input field
  }
  else if (e.key === "ArrowUp") {
    if (historyIndex > 0) {
      historyIndex--;
      commandInput.value = commandHistory[historyIndex]; // Show previous command
    }
  }
  else if (e.key === "ArrowDown") {
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      commandInput.value = commandHistory[historyIndex]; // Show next command
    } else {
      commandInput.value = ""; // Clear input field if at the end of history
    }
  }
});

// Initialize the application
loadFileSystem();
