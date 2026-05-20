const vscode = require('vscode');
const { spawn } = require('child_process');

let serverProcess = null;
let statusBarItem;
let outputChannel;

function activate(context) {
  outputChannel = vscode.window.createOutputChannel("Mimix Server");
  
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'mimix.toggleServer';
  statusBarItem.text = "$(play) Start Mimix";
  statusBarItem.show();

  const toggleCommand = vscode.commands.registerCommand('mimix.toggleServer', () => {
    if (serverProcess) {
      stopServer();
    } else {
      startServer();
    }
  });

  context.subscriptions.push(toggleCommand, statusBarItem, outputChannel);
}

function startServer() {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("Open a workspace to start Mimix.");
    return;
  }

  const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
  
  serverProcess = spawn('npx', ['mimix', 'serve'], { cwd: workspacePath, shell: true });
  
  statusBarItem.text = "$(stop) Stop Mimix";
  vscode.window.showInformationMessage("Mimix Server Started");

  // Pipe process streams to the VS Code Output Channel
  serverProcess.stdout.on('data', (data) => outputChannel.append(data.toString()));
  serverProcess.stderr.on('data', (data) => outputChannel.append(data.toString()));

  serverProcess.on('close', () => {
    stopServer();
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  statusBarItem.text = "$(play) Start Mimix";
  vscode.window.showInformationMessage("Mimix Server Stopped");
}

function deactivate() {
  stopServer();
}

module.exports = { activate, deactivate };