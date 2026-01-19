<template>
  <div class="file-importer">
    <!-- Header -->
    <div class="importer-header">
      <h3>Import Project Context</h3>
      <p>Upload files to help AI generate better project plans</p>
      <button v-if="importedFiles.length > 0" @click="skipImport" class="skip-btn">
        Skip & Start Fresh
      </button>
    </div>
    
    <!-- Import Options Grid -->
    <div class="import-options">
      
      <!-- Option 1: Upload Files -->
      <div class="import-card" :class="{ active: activeTab === 'upload' }">
        <div class="card-header" @click="activeTab = 'upload'">
          <div class="card-icon">📄</div>
          <h4>Upload Files</h4>
          <p class="card-desc">Architecture docs, requirements, existing plans</p>
        </div>
        
        <div v-show="activeTab === 'upload'" class="card-content">
          <div 
            class="upload-area" 
            @drop.prevent="handleDropFiles" 
            @dragover.prevent="dragActive = true" 
            @dragleave="dragActive = false"
            :class="{ 'drag-active': dragActive }"
          >
            <div class="upload-icon">📤</div>
            <p>Drag files here or</p>
            <button @click="selectFiles" class="upload-btn">
              Choose Files
            </button>
            <p class="file-types">Supports: .md, .txt, .json, .yaml, .yml</p>
            <p class="file-size-limit">Max 10MB per file, up to 5 files</p>
          </div>
          <input 
            ref="fileInput" 
            type="file" 
            multiple 
            accept=".md,.txt,.json,.yaml,.yml"
            @change="handleFileSelection"
            style="display: none"
          />
        </div>
      </div>
      
      <!-- Option 2: Paste Text -->
      <div class="import-card" :class="{ active: activeTab === 'paste' }">
        <div class="card-header" @click="activeTab = 'paste'">
          <div class="card-icon">📋</div>
          <h4>Paste Content</h4>
          <p class="card-desc">Requirements, user stories, notes</p>
        </div>
        
        <div v-show="activeTab === 'paste'" class="card-content">
          <textarea 
            v-model="pastedContent" 
            placeholder="Paste your project requirements, user stories, or any project context here...&#10;&#10;Example:&#10;- Build a REST API with authentication&#10;- Support 1000 concurrent users&#10;- Deploy to AWS&#10;- Requires PostgreSQL database"
            rows="10"
            class="paste-area"
          ></textarea>
          <div class="paste-stats">
            <span>{{ pastedContent.length }} characters</span>
            <button v-if="pastedContent.length > 0" @click="processPastedContent" class="import-btn">
              Process Text
            </button>
          </div>
        </div>
      </div>
      
      <!-- Option 3: Workspace Files -->
      <div class="import-card" :class="{ active: activeTab === 'workspace' }">
        <div class="card-header" @click="activeTab = 'workspace'">
          <div class="card-icon">📁</div>
          <h4>Workspace Files</h4>
          <p class="card-desc">Select files from current workspace</p>
        </div>
        
        <div v-show="activeTab === 'workspace'" class="card-content">
          <div class="workspace-browser">
            <div v-if="loadingWorkspaceFiles" class="loading">
              <span class="spinner"></span>
              Loading workspace files...
            </div>
            
            <div v-else-if="workspaceFiles.length === 0" class="empty-state">
              <p>No supported files found in workspace</p>
              <p class="hint">Looking for: README.md, architecture.md, requirements.md, .json files</p>
            </div>
            
            <div v-else class="file-list">
              <label v-for="file in workspaceFiles" :key="file.path" class="file-checkbox">
                <input type="checkbox" v-model="selectedWorkspaceFiles" :value="file">
                <span class="file-icon">{{ getFileIcon(file.path) }}</span>
                <span class="file-path">{{ file.path }}</span>
                <span class="file-size">{{ formatSize(file.size) }}</span>
              </label>
            </div>
            
            <button v-if="selectedWorkspaceFiles.length > 0" @click="processWorkspaceFiles" class="import-btn">
              Import {{ selectedWorkspaceFiles.length }} File(s)
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Imported Files Summary -->
    <div v-if="importedFiles.length > 0" class="imported-summary">
      <div class="summary-header">
        <h4>📦 Imported Context</h4>
        <span class="file-count">{{ importedFiles.length }} item(s) • {{ formatSize(totalSize) }}</span>
      </div>
      
      <div class="file-list">
        <div v-for="file in importedFiles" :key="file.id" class="file-item">
          <div class="item-icon">{{ getFileIcon(file.name) }}</div>
          <div class="item-content">
            <div class="item-name">{{ file.name }}</div>
            <div class="item-preview">{{ file.preview }}</div>
          </div>
          <button @click="removeFile(file.id)" class="remove-btn" title="Remove this file">×</button>
        </div>
      </div>
      
      <!-- Context Analysis -->
      <div v-if="contextAnalysis" class="context-analysis">
        <div class="analysis-header">
          <h5>🤖 AI Analysis</h5>
        </div>
        <div class="analysis-content">
          <div class="analysis-item">
            <span class="label">Suggested Template:</span>
            <span class="value">{{ contextAnalysis.suggestedTemplate }}</span>
          </div>
          <div class="analysis-item">
            <span class="label">Detected Topics:</span>
            <div class="topics">
              <span v-for="topic in contextAnalysis.topics" :key="topic" class="topic">
                {{ topic }}
              </span>
            </div>
          </div>
          <div class="analysis-item">
            <span class="label">Context Summary:</span>
            <p class="summary-text">{{ contextAnalysis.summary }}</p>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="import-actions">
        <button @click="startWizardWithContext" class="primary-btn">
          ✨ Start Plan Builder with Context
        </button>
        <button @click="clearAll" class="secondary-btn">
          Clear All
        </button>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isProcessing" class="processing-overlay">
      <div class="processing-dialog">
        <span class="spinner"></span>
        <p>{{ processingMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ContextImportService } from '../services/ContextImporter';

interface ImportedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  preview: string;
}

interface ContextAnalysis {
  suggestedTemplate: string;
  topics: string[];
  summary: string;
  estimatedDuration: string;
  recommendedTeamSize: number;
}

interface WorkspaceFile {
  path: string;
  size: number;
  type: string;
}

const emit = defineEmits<{
  (e: 'contextImported', context: { files: ImportedFile[]; analysis: ContextAnalysis | null }): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const pastedContent = ref('');
const importedFiles = ref<ImportedFile[]>([]);
const selectedWorkspaceFiles = ref<WorkspaceFile[]>([]);
const workspaceFiles = ref<WorkspaceFile[]>([]);
const activeTab = ref('upload');
const dragActive = ref(false);
const loadingWorkspaceFiles = ref(false);
const isProcessing = ref(false);
const processingMessage = ref('');
const contextAnalysis = ref<ContextAnalysis | null>(null);

const totalSize = computed(() => 
  importedFiles.value.reduce((sum, f) => sum + f.size, 0)
);

onMounted(async () => {
  await loadWorkspaceFiles();
});

// File handling methods
async function selectFiles() {
  fileInput.value?.click();
}

function handleFileSelection(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (files) {
    handleFiles(Array.from(files));
  }
}

function handleDropFiles(event: DragEvent) {
  event.preventDefault();
  dragActive.value = false;
  const files = event.dataTransfer?.files;
  if (files) {
    handleFiles(Array.from(files));
  }
}

async function handleFiles(files: File[]) {
  // Validate file count
  if (importedFiles.value.length + files.length > 5) {
    alert('Maximum 5 files allowed');
    return;
  }

  isProcessing.value = true;
  processingMessage.value = `Importing ${files.length} file(s)...`;
  
  try {
    for (const file of files) {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`File ${file.name} exceeds 10MB limit`);
        continue;
      }

      // Validate file type
      const validExtensions = ['.md', '.txt', '.json', '.yaml', '.yml'];
      const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!hasValidExtension) {
        console.warn(`File ${file.name} has unsupported type`);
        continue;
      }

      await importFile(file);
    }
    
    // Analyze context
    if (importedFiles.value.length > 0) {
      await analyzeImportedContext();
    }
  } catch (error) {
    console.error('Error importing files:', error);
    alert('Error importing files. Please try again.');
  } finally {
    isProcessing.value = false;
  }
}

async function importFile(file: File) {
  const content = await file.text();
  const preview = content.substring(0, 150).replace(/\n/g, ' ') + '...';
  
  importedFiles.value.push({
    id: Math.random().toString(36).substring(2),
    name: file.name,
    type: file.type,
    size: file.size,
    content,
    preview
  });
}

async function processPastedContent() {
  if (!pastedContent.value.trim()) return;
  
  isProcessing.value = true;
  processingMessage.value = 'Processing pasted content...';
  
  try {
    importedFiles.value.push({
      id: Math.random().toString(36).substring(2),
      name: 'Pasted Content',
      type: 'text/plain',
      size: pastedContent.value.length,
      content: pastedContent.value,
      preview: pastedContent.value.substring(0, 150) + '...'
    });
    
    pastedContent.value = '';
    activeTab.value = 'upload';
    await analyzeImportedContext();
  } finally {
    isProcessing.value = false;
  }
}

async function loadWorkspaceFiles() {
  loadingWorkspaceFiles.value = true;
  try {
    const service = new ContextImportService();
    workspaceFiles.value = await service.findWorkspaceFiles();
  } catch (error) {
    console.error('Error loading workspace files:', error);
  } finally {
    loadingWorkspaceFiles.value = false;
  }
}

async function processWorkspaceFiles() {
  if (selectedWorkspaceFiles.value.length === 0) return;
  
  isProcessing.value = true;
  processingMessage.value = `Importing ${selectedWorkspaceFiles.value.length} workspace file(s)...`;
  
  try {
    const service = new ContextImportService();
    for (const file of selectedWorkspaceFiles.value) {
      const content = await service.readWorkspaceFile(file.path);
      importedFiles.value.push({
        id: Math.random().toString(36).substring(2),
        name: file.path.split('/').pop() || file.path,
        type: 'file',
        size: content.length,
        content,
        preview: content.substring(0, 150) + '...'
      });
    }
    
    selectedWorkspaceFiles.value = [];
    await analyzeImportedContext();
  } catch (error) {
    console.error('Error processing workspace files:', error);
    alert('Error processing workspace files. Please try again.');
  } finally {
    isProcessing.value = false;
  }
}

async function analyzeImportedContext() {
  isProcessing.value = true;
  processingMessage.value = 'Analyzing context with AI...';
  
  try {
    const service = new ContextImportService();
    const allContent = importedFiles.value.map(f => f.content).join('\n\n');
    contextAnalysis.value = await service.analyzeContext(allContent);
  } catch (error) {
    console.error('Error analyzing context:', error);
    // Continue without analysis
  } finally {
    isProcessing.value = false;
  }
}

function removeFile(id: string) {
  importedFiles.value = importedFiles.value.filter(f => f.id !== id);
  
  // Re-analyze if files still exist
  if (importedFiles.value.length > 0) {
    analyzeImportedContext();
  } else {
    contextAnalysis.value = null;
  }
}

function clearAll() {
  importedFiles.value = [];
  contextAnalysis.value = null;
}

function skipImport() {
  clearAll();
  startWizardWithContext();
}

async function startWizardWithContext() {
  // Emit context to parent component
  const context = {
    files: importedFiles.value,
    analysis: contextAnalysis.value
  };
  
  emit('contextImported', context);
}

function getFileIcon(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.json')) return '📊';
  if (lower.endsWith('.md') || lower.endsWith('.txt')) return '📝';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return '⚙️';
  return '📦';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
</script>

<style scoped>
.file-importer {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.importer-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.importer-header h3 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: var(--vscode-foreground);
}

.importer-header p {
  margin: 0;
  color: var(--vscode-descriptionForeground);
}

.skip-btn {
  padding: 8px 16px;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.import-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.import-card {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.import-card.active {
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 0 0 1px var(--vscode-focusBorder);
}

.card-header {
  padding: 16px;
  cursor: pointer;
  background: var(--vscode-editor-background);
}

.card-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.card-header h4 {
  margin: 0 0 4px 0;
  color: var(--vscode-foreground);
}

.card-desc {
  margin: 0;
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
}

.card-content {
  padding: 16px;
  background: var(--vscode-sideBar-background);
}

.upload-area {
  border: 2px dashed var(--vscode-panel-border);
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  transition: all 0.2s;
}

.upload-area.drag-active {
  border-color: var(--vscode-focusBorder);
  background: var(--vscode-editor-background);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-btn {
  padding: 8px 24px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin: 8px 0;
}

.file-types,
.file-size-limit {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin: 4px 0;
}

.paste-area {
  width: 100%;
  padding: 12px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  font-family: var(--vscode-editor-font-family);
  resize: vertical;
}

.paste-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
}

.import-btn,
.primary-btn {
  padding: 8px 16px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.secondary-btn {
  padding: 8px 16px;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 8px;
}

.workspace-browser {
  min-height: 200px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--vscode-descriptionForeground);
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--vscode-progressBar-background);
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--vscode-descriptionForeground);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.file-checkbox {
  display: flex;
  align-items: center;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.file-checkbox:hover {
  background: var(--vscode-list-hoverBackground);
}

.file-icon {
  margin: 0 8px;
}

.file-path {
  flex: 1;
  font-size: 13px;
}

.file-size {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.imported-summary {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 20px;
  background: var(--vscode-editor-background);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.summary-header h4 {
  margin: 0;
  font-size: 18px;
}

.file-count {
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
}

.file-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  margin-bottom: 8px;
}

.item-icon {
  font-size: 24px;
  margin-right: 12px;
}

.item-content {
  flex: 1;
}

.item-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.item-preview {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.remove-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  padding: 0 8px;
}

.context-analysis {
  margin: 16px 0;
  padding: 16px;
  background: var(--vscode-sideBar-background);
  border-radius: 4px;
}

.analysis-header h5 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.analysis-item {
  margin-bottom: 12px;
}

.analysis-item .label {
  font-weight: 500;
  margin-right: 8px;
}

.topics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.topic {
  padding: 4px 12px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 12px;
  font-size: 12px;
}

.summary-text {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
}

.import-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.processing-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.processing-dialog {
  background: var(--vscode-editor-background);
  padding: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>
