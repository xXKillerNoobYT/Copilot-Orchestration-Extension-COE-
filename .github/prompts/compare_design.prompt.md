---
description: Compare live website UI against Figma design references. Automatically captures screenshots and generates an HTML report with visual differences, comparison scores, and improvement recommendations.
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'agent', 'updateUserPreferences', 'memory', 'todo']
agent: agent
---

# Design Comparison Mode

## Core Objective

When the user enters **"Compare Design {url}"**, execute this workflow to validate the live website against the provided Figma reference image and generate a comprehensive HTML comparison report.

---

## Workflow Steps

### **1. Gather Required Inputs**

When the user writes **"Compare Design {url}"** or similar command, immediately ask for:
- **(a) Command / URL** — The starting URL (if not already provided)
- **(b) Figma reference image** — The design mockup to compare against (accept image file path or attachment)
- **(c) Process Flow** — The sequence of steps to reach the desired state (e.g., "Go to Home -> Click Login -> Enter User/Pass -> Click Submit -> Wait for Dashboard")
- **(d) Page Description** — What page/section this represents

**Important Rules:**
- If any input is missing, ask for them.
- Copy the Figma image to: `{workspaceRoot}/Figma/{original-filename}`
- Once inputs are received, proceed autonomously.
- **Note**: {workspaceRoot} represents the current VS Code workspace folder

---

### **2. Navigate and Capture Live Website**

Using Playwright MCP Server (crawl through the DOM):
1. **Launch Browser**: Open the provided URL using Playwright.
2. **Execute Process Flow**:
   - Follow the user's "Process Flow" step-by-step.
   - Interact with elements (Click, Fill, Select) exactly as described.
   - Handle navigation, waiting, and dynamic content.
   - Crawl through the DOM to find elements intelligently if selectors aren't provided (use accessibility roles, text, etc.).
3. **Wait for State**: Ensure the page is fully loaded (network idle, assets loaded).
4. **Capture**: Take a full-page screenshot of the target page.
5. **Save**: Save screenshot to: `{workspaceRoot}/test-results/design-comparison/live-{timestamp}.png`

---

### **3. Perform Visual Comparison**

Using **Copilot Auto Vision (copilot/auto)**:
1. Load both images:
   - Figma reference image (from `Figma/` folder)
   - Live website screenshot (from `test-results/design-comparison/`)

2. **Analyze and compare these design elements:**
   - **Layout & Structure:** Grid alignment, component positioning, section spacing
   - **Typography:** Font families, sizes, weights, line heights, letter spacing
   - **Colors:** Brand colors, backgrounds, text colors, button colors, borders
   - **Spacing:** Margins, padding, gaps between elements
   - **Imagery:** Images, icons, logos (placement, sizing, quality)
   - **Components:** Buttons, forms, cards, navigation elements
   - **Copy/Content:** Text accuracy, formatting, alignment
   - **Visual States:** Hover states, focus states (if visible)

3. **Calculate Comparison Score:**
   - Assign a percentage score (0-100%) based on overall visual similarity
   - Break down scores by category (layout: X%, typography: Y%, colors: Z%, etc.)

4. **Identify Differences:**
   - List all visual discrepancies found
   - Categorize by severity: Critical, High, Medium, Low
   - For each difference, note:
     - Location/component affected
     - What's expected (Figma design)
     - What's actual (live website)
     - Visual impact

5. **Generate Annotated Images:**
   - Create an annotated diff image highlighting differences with bounding boxes/markers
   - Save to: `{workspaceRoot}/test-results/design-comparison/diff-{timestamp}.png`

---

### **4. Generate Improvement Recommendations**

For each identified difference, provide:
- **What to fix:** Clear description of the issue
- **How to fix:** Specific CSS/HTML suggestions or design guidance
- **Priority:** Which issues should be addressed first
- **Impact:** How fixing this will improve design accuracy

Example recommendations:
- "Increase header font size from 32px to 48px to match Figma"
- "Update primary button color from #007bff to #0066CC"
- "Add 40px bottom margin to hero section"

---

### **5. Create HTML Comparison Report**

Generate a professional HTML report saved to: `{workspaceRoot}/test-results/design-comparison/comparison-report-{timestamp}.html`

**Report Structure:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Design Comparison Report - {Page Name} - {Date}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header h1 { color: #2d3748; font-size: 36px; margin-bottom: 20px; }
        .header-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .info-item { padding: 10px; background: #f7fafc; border-radius: 6px; }
        .info-item strong { color: #4a5568; display: block; margin-bottom: 5px; }
        
        .score-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .score-card {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        .score-card:hover { transform: translateY(-5px); }
        .score-number {
            font-size: 56px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .score-label { color: #4a5568; font-size: 16px; font-weight: 500; }
        
        .images-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .image-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .image-card h3 { 
            color: #2d3748; 
            margin-bottom: 15px; 
            font-size: 20px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .image-card img {
            width: 100%;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .full-width { grid-column: 1 / -1; }
        
        .differences-section {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin: 20px 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .differences-section h2 {
            color: #2d3748;
            margin-bottom: 20px;
            font-size: 28px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        th { font-weight: 600; }
        tbody tr:hover { background: #f7fafc; }
        
        .severity-critical { 
            color: white;
            background: #f56565;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
        }
        .severity-high { 
            color: white;
            background: #ed8936;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
        }
        .severity-medium { 
            color: white;
            background: #ecc94b;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
        }
        .severity-low { 
            color: white;
            background: #48bb78;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
        }
        
        .recommendations {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin: 20px 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .recommendations h2 {
            color: #2d3748;
            margin-bottom: 20px;
            font-size: 28px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .recommendation-item {
            background: #f7fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
        }
        .recommendation-item h4 {
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 18px;
        }
        .recommendation-item p {
            color: #4a5568;
            line-height: 1.6;
            margin: 5px 0;
        }
        .priority-high { border-left-color: #f56565; }
        .priority-medium { border-left-color: #ed8936; }
        .priority-low { border-left-color: #48bb78; }
        
        .summary {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin: 20px 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .summary h3 {
            color: #2d3748;
            margin-bottom: 15px;
            font-size: 24px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .summary-item {
            padding: 15px;
            background: #f7fafc;
            border-radius: 8px;
            text-align: center;
        }
        .summary-item strong {
            display: block;
            color: #4a5568;
            margin-bottom: 5px;
        }
        .summary-item span {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
        }
        .verdict {
            font-size: 20px;
            font-weight: bold;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin-top: 20px;
        }
        .verdict-pass { background: #c6f6d5; color: #22543d; }
        .verdict-needs-improvement { background: #feebc8; color: #7c2d12; }
        .verdict-fail { background: #fed7d7; color: #742a2a; }
        
        @media (max-width: 768px) {
            .images-section { grid-template-columns: 1fr; }
            .score-section { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🎨 Design Comparison Report</h1>
            <div class="header-info">
                <div class="info-item">
                    <strong>🌐 URL:</strong>
                    <span>{url}</span>
                </div>
                <div class="info-item">
                    <strong>📄 Page:</strong>
                    <span>{page description}</span>
                </div>
                <div class="info-item">
                    <strong>📅 Date:</strong>
                    <span>{timestamp}</span>
                </div>
            </div>
        </div>

        <!-- Score Cards -->
        <div class="score-section">
            <div class="score-card">
                <div class="score-number">{overall}%</div>
                <div class="score-label">Overall Match</div>
            </div>
            <div class="score-card">
                <div class="score-number">{layout}%</div>
                <div class="score-label">Layout & Structure</div>
            </div>
            <div class="score-card">
                <div class="score-number">{typography}%</div>
                <div class="score-label">Typography</div>
            </div>
            <div class="score-card">
                <div class="score-number">{colors}%</div>
                <div class="score-label">Colors</div>
            </div>
            <div class="score-card">
                <div class="score-number">{spacing}%</div>
                <div class="score-label">Spacing</div>
            </div>
        </div>

        <!-- Images Comparison -->
        <div class="images-section">
            <div class="image-card">
                <h3>📐 Figma Design (Expected)</h3>
                <img src="{relative-path-to-figma}" alt="Figma Design Reference">
            </div>
            <div class="image-card">
                <h3>🌐 Live Website (Actual)</h3>
                <img src="{relative-path-to-live}" alt="Live Website Screenshot">
            </div>
        </div>

        <!-- Annotated Diff -->
        <div class="images-section">
            <div class="image-card full-width">
                <h3>🔍 Annotated Differences</h3>
                <img src="{relative-path-to-diff}" alt="Highlighted Differences">
            </div>
        </div>

        <!-- Differences Table -->
        <div class="differences-section">
            <h2>🐛 Identified Differences ({total-count} issues)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Severity</th>
                        <th>Category</th>
                        <th>Location</th>
                        <th>Expected (Figma)</th>
                        <th>Actual (Live)</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Dynamic rows per difference -->
                    <tr>
                        <td><span class="severity-{level}">{LEVEL}</span></td>
                        <td>{category}</td>
                        <td>{location}</td>
                        <td>{expected}</td>
                        <td>{actual}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Recommendations -->
        <div class="recommendations">
            <h2>💡 Improvement Recommendations</h2>
            <!-- Dynamic recommendation items -->
            <div class="recommendation-item priority-{level}">
                <h4>🎯 {Issue Title}</h4>
                <p><strong>What to fix:</strong> {description}</p>
                <p><strong>How to fix:</strong> {solution}</p>
                <p><strong>Priority:</strong> {priority} | <strong>Impact:</strong> {impact}</p>
            </div>
        </div>

        <!-- Summary -->
        <div class="summary">
            <h3>📊 Summary</h3>
            <div class="summary-grid">
                <div class="summary-item">
                    <strong>Critical Issues</strong>
                    <span>{critical-count}</span>
                </div>
                <div class="summary-item">
                    <strong>High Issues</strong>
                    <span>{high-count}</span>
                </div>
                <div class="summary-item">
                    <strong>Medium Issues</strong>
                    <span>{medium-count}</span>
                </div>
                <div class="summary-item">
                    <strong>Low Issues</strong>
                    <span>{low-count}</span>
                </div>
                <div class="summary-item">
                    <strong>Total Issues</strong>
                    <span>{total-count}</span>
                </div>
            </div>
            
            <div class="verdict verdict-{status}">
                🎯 Verdict: {Pass / Needs Improvement / Fail}
            </div>
        </div>
    </div>
</body>
</html>
```

---

### **6. Final Output**

After generating the report:
1. **Start Local Server**: Start a simple localhost server (e.g., `npx http-server` or related tools) in the report directory.
2. **Display Result**: Open the localhost URL (e.g., `http://localhost:8080/comparison-report-{timestamp}.html`) in the browser.
3. Inform the user:
   - ✅ Comparison complete
   - 📊 Overall match score: X%
   - 🔍 Issues found: X critical, Y high, Z medium, W low
   - 🌐 Report served at: `http://localhost:8080/...`

---

## Key Success Criteria

✅ Automated screenshot capture of live website  
✅ Side-by-side visual comparison with Figma design  
✅ Numerical comparison scores (overall + by category)  
✅ Detailed differences with severity levels  
✅ Actionable improvement recommendations  
✅ Professional HTML report with embedded images  
✅ Annotated diff image highlighting discrepancies  
✅ Auto-open report in browser

---

## Example Usage

**User:**
```
Compare Design https://example.com
```

**Agent:**
```
I need:
1. What is the Base URL/Command?
2. Figma reference image (file path)
3. Process Flow (steps to reach state)
4. Page Description
```

**User:**
```
1. https://example.com
2. C:\Downloads\dashboard-figma.png
3. Click 'Login', Type 'user' in #user, Type 'pass' in #pass, Click 'Submit', Wait for .dashboard
4. Dashboard Page
```

**Agent executes autonomously:**
1. Copies Figma to project folder
2. Launches Playwright & Crawls through DOM following Process Flow
3. Captures screenshot
4. Compares images via Copilot/Gemini 3 Pro
5. Calculates scores & identifies differences
6. Generates HTML report
7. Starts local server & Opens report

**Output:**
```
✅ Design comparison complete!
📊 Overall Match: 87%
🔍 Issues: 2 critical, 5 high, 8 medium, 3 low
🌐 Report served at: http://localhost:8080/comparison-report-2026-01-18.html
```
