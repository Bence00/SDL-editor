# SDL-88 Diagram Editor

A simple browser-based SDL (Specification and Description Language) diagram editor.  
Supports placing, moving, resizing and connecting nodes, snap-to-grid, multi-selection, and save/load.

## Running the Project

The project uses PHP for saving/loading diagrams.  
Start the built-in PHP development server:

```bash
php -S localhost:8000
```

## Current State — 2025.11.15.

![current state](/images/image.png)


## Tutorial

**Delete nodes:**  
Press **X**, **Backspace**, or **Delete** to remove the selected node(s).

**Decision branch labels:**  
Double-click an outgoing edge of a **Decision** node to edit its branch name (e.g. "yes", "no").
