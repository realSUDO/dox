const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('find apps/web/components -type f -name "*.tsx"').toString().trim().split('\n');

const replacements = {
  // Backgrounds
  'bg-[#FBFBFA]': 'bg-background',
  'bg-[#F3F3F3]': 'bg-muted',
  'bg-[#EBEBEB]': 'bg-accent',
  'bg-[#144637]': 'bg-primary',
  'bg-[#0F3529]': 'bg-primary/90',
  'bg-[#f0edef]': 'bg-secondary',
  'bg-[#fcf8fb]': 'bg-background',
  'bg-[#fcf8fb]/80': 'bg-background/80',
  'bg-white': 'bg-card',
  
  // Text
  'text-[#1B1B1D]': 'text-foreground',
  'text-[#1b1b1d]': 'text-foreground',
  'text-[#6B6B6B]': 'text-muted-foreground',
  'text-[#404945]': 'text-muted-foreground',
  'text-[#144637]': 'text-primary',
  'text-white': 'text-primary-foreground',
  
  // Borders
  'border-[#EBEBEB]': 'border-border',
  'border-[#c0c9c3]': 'border-border',
  'border-[#D1D1D1]': 'border-primary/20',
  
  // Hovers
  'hover:bg-[#F9F9F9]': 'hover:bg-accent',
  'hover:bg-[#EBEBEB]': 'hover:bg-accent/80',
  'hover:bg-[#F3F3F3]': 'hover:bg-accent',
  'hover:bg-[#e4e2e4]': 'hover:bg-accent',
  'hover:bg-[#eae7ea]': 'hover:bg-accent',
  'hover:bg-[#f0edef]': 'hover:bg-accent',
  'hover:bg-[#0F3529]': 'hover:bg-primary/90',
  'hover:text-[#1B1B1D]': 'hover:text-foreground',
  
  // Specific arbitrary values
  'bg-[#F9F9F9]': 'bg-accent/50',
  'bg-[#E8F3F0]': 'bg-primary/10',
  'border-[#144637]/30': 'border-primary/30',
  'border-[#144637]/5': 'border-primary/5',
  'shadow-[#144637]/20': 'shadow-primary/20',
  
  // Selection
  'selection:bg-[#144637]': 'selection:bg-primary',
  'selection:text-white': 'selection:text-primary-foreground',
  
  // Gradients
  'from-[#FBFBFA]': 'from-background',
  'to-white': 'to-card',
};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(key.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g');
    content = content.replace(regex, value);
  }
  
  if (content !== originalContent) {
    console.log('Updated: ' + file);
    fs.writeFileSync(file, content);
  }
});
