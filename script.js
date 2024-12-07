let fileSystem = {};
let currentDir = {};
let path = [""];
let commandHistory = [];
let historyIndex = -1;
let currentPathStr = "root";

const SCRIPT_ID = "AKfycbzwU0PzHcHPYQWTEvzmowOxJ4NGdv3KMhfPH6dnpr4ihkzeudx9Xllw3x-euoXscn55";
const FOLDER_ID = "138LS_NKFaTZIlDcujQbNJEo_X_b4z77y";

const consoleElement = document.getElementById("console");
const commandInput = document.getElementById("command-input");
const prompt = document.getElementById("prompt");

prompt.innerHTML = `${path.at(-1)}$ `;

let loadingAnimationInterval = null;

// Update console with new output
function updateConsole(output, type) {
  const div = document.createElement("div");
  div.classList.add(type);

  div.innerHTML = output.replace(/\n/g, "<br>");
  div.style.whiteSpace = "pre-wrap";

  consoleElement.appendChild(div);
  consoleElement.scrollTop = consoleElement.scrollHeight;
}

// Function to start loading animation
function startLoading() {
  commandInput.disabled = true;
  let i = 0;
  const animations = ["|", "/", "-", "\\"];
  loadingAnimationInterval = setInterval(() => {
    prompt.innerHTML = `${path.at(-1)}$ ${animations[i]}`;
    i = (i + 1) % animations.length;
  }, 250);
}

// Function to stop loading animation
function stopLoading() {
  clearInterval(loadingAnimationInterval);
  prompt.innerHTML = `${path.at(-1)}$ `;
  commandInput.disabled = false;
}

// Function to generate the directory tree recursively
function generateTree(dir, depth = 0, prefix = "") {
  let tree = "";
  const keys = Object.keys(dir).filter(key => key !== 'id' && key !== 'content'); // Exclude 'id' and 'content'
  const lastIndex = keys.length - 1;

  keys.forEach((key, index) => {
    const isLast = index === lastIndex;

    tree += prefix + (isLast ? "└── " : "├── ") + key + "\n";

    if (typeof dir[key] === "object") {
      tree += generateTree(dir[key], depth + 1, prefix + (isLast ? "    " : "│   "));
    }
  });

  return tree;
}

function parseCommand(command, sudo) {
  const [cmd, ...args] = command.split(" ");
  switch (cmd) {
    case "ls":
      if (typeof currentDir === 'object' && currentDir) {
        const filteredKeys = Object.keys(currentDir).filter(key => key !== "id");
        updateConsole(filteredKeys.join(" "), "content");
      } else {
        updateConsole("Not a directory", "error");
      }
      break;
    case "cd":
      if (args[0] && currentDir && currentDir[args[0]]) {
        path.push(args[0]);
        currentDir = currentDir[args[0]]; // Access the content of the directory
        currentPathStr = path.join("/");
        prompt.innerText = `${path.at(-1)}$ `;
      } else if (args[0] === "..") {
        if (path.length > 1) {
          path.pop();
          currentDir = path.reduce((acc, dir) => acc[dir], fileSystem); // Ensure accessing content
          currentPathStr = path.join("/");
          prompt.innerText = `${path.at(-1)}$ `;
        }
      } else {
        updateConsole("Directory not found", "error");
      }
      break;
    case "cat":
      if (args[0] && currentDir[args[0]] && typeof currentDir[args[0]]["id"] && currentDir[args[0]] === "") {
        startLoading();
        fetch(`https://script.google.com/macros/s/${SCRIPT_ID}/exec?action=getContent&fileId=${currentDir[args[0]]["id"]}`, {})
            .then(response => response.json())
            .then(data => {
              currentDir[args[0]] = data["content"];
              updateConsole(currentDir[args[0]], "content");
              stopLoading();
            })
            .catch(error => {
              updateConsole("Error loading file content", "error");
              console.error(error);
              stopLoading();
            });
      } else if (args[0] && currentDir[args[0]]) {
        updateConsole(currentDir[args[0]], "content");
      } else {
        updateConsole("File not found", "error");
      }
      break;
    case "tree":
      if (typeof currentDir === 'object' && currentDir) {
        const tree = generateTree(currentDir); // Ensure you're generating the tree based on content
        updateConsole(tree, "content");
      } else {
        updateConsole("Not a directory", "error");
      }
      break;
    case "touch":
      if (args[0]) {
        startLoading();
        const folderId = currentDir["id"];
        fetch(`https://script.google.com/macros/s/${SCRIPT_ID}/exec?action=touch`, {
          redirect: "follow",
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            folderId: folderId,
            fileName: args[0]
          })
        })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                currentDir[args[0]] = { id: data["fileId"], content: "" }; // Add file under content
                updateConsole(`File '${args[0]}' created successfully`, "success");
              } else {
                updateConsole(`Error creating file: ${data.message}`, "error");
              }
              stopLoading();
            })
            .catch(error => {
              updateConsole("Error creating file", "error");
              console.error(error);
              stopLoading();
            });
      } else {
        updateConsole("Usage: touch [filename]", "error");
      }
      break;
    case "mkdir":
      if (args[0]) {
        startLoading();
        const folderId = currentDir["id"];
        fetch(`https://script.google.com/macros/s/${SCRIPT_ID}/exec?action=mkdir`, {
          redirect: "follow",
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            folderId: folderId,
            folderName: args[0]
          })
        })
            .then(response => response.json())
            .then(data => {
              console.log(data);
              if (data.success) {
                currentDir[args[0]] = { "id": data["folderId"] };
                updateConsole(`Folder '${args[0]}' created successfully`, "success");
              } else {
                updateConsole(`Error creating folder: ${data.message}`, "error");
              }
              stopLoading();
            })
            .catch(error => {
              updateConsole("Error creating folder", "error");
              console.error(error);
              stopLoading();
            });
      } else {
        updateConsole("Usage: mkdir [folderName]", "error");
      }
      break;
    case "pwd":
      updateConsole(`/${currentPathStr}`, "content");
      break;
    case "history":
      if (commandHistory.length === 0) {
        updateConsole("No commands in history", "content");
      } else {
        const historyOutput = commandHistory
            .map((cmd, index) => `${index + 1}: ${cmd}`)
            .join("\n");
        updateConsole(historyOutput, "content");
      }
      break;
    case "help":
      updateConsole("Commands: ls, cd [dir], cat [file], tree, touch [file], mkdir [folder], pwd, help", "content");
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
        currentDir = fileSystem["root"]["users"]["guest"]; // Начинаем с "root"
        path = ["root", "users", "guest"]; // Устанавливаем начальный путь
        updateConsole("File system loaded!", "success");
        console.log(fileSystem);
        stopLoading();
      })
      .catch(error => {
        updateConsole("Error loading file system: " + error, "error");
        stopLoading();
      });
}

// Handle keydown events for command input
commandInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const command = commandInput.value;
    if (command.trim()) {

      if (command.startsWith("sudo")) {
        updateConsole(`${path.at(-1)}# ${command}`, "message");
        parseCommand(command.slice(5), true);
      } else {
        updateConsole(`${path.at(-1)}$ ${command}`, "message");
        parseCommand(command, false);
      }

      prompt.innerText = `${path.at(-1)}$ `;

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