import React, { useState, useRef, useEffect } from 'react';

interface CodeEditorProps {
  value: string;
  onChange ? : (value: string) => void;
  language ? : string;
  readOnly ? : boolean;
  height ? : string | number;
  showLineNumbers ? : boolean;
  theme ? : 'dark' | 'light';
  className ? : string;
}

const CodeEditor: React.FC < CodeEditorProps > = ({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
  height = '400px',
  showLineNumbers = true,
  theme = 'dark',
  className = ''
}) => {
  const [code, setCode] = useState(value);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const textareaRef = useRef < HTMLTextAreaElement > (null);
  const preRef = useRef < HTMLPreElement > (null);
  
  useEffect(() => {
    setCode(value);
  }, [value]);
  
  useEffect(() => {
    if (textareaRef.current && preRef.current) {
      const syncScroll = () => {
        if (preRef.current) {
          preRef.current.scrollTop = textareaRef.current!.scrollTop;
          preRef.current.scrollLeft = textareaRef.current!.scrollLeft;
        }
      };
      
      textareaRef.current.addEventListener('scroll', syncScroll);
      return () => textareaRef.current?.removeEventListener('scroll', syncScroll);
    }
  }, []);
  
  const handleChange = (e: React.ChangeEvent < HTMLTextAreaElement > ) => {
    const newValue = e.target.value;
    setCode(newValue);
    onChange?.(newValue);
    updateCursorPosition(e.target);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent < HTMLTextAreaElement > ) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      
      const newValue = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newValue);
      onChange?.(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };
  
  const updateCursorPosition = (textarea: HTMLTextAreaElement) => {
    const lines = code.substring(0, textarea.selectionStart).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    setCursorPosition({ line, column });
  };
  
  const handleTextareaClick = (e: React.MouseEvent < HTMLTextAreaElement > ) => {
    updateCursorPosition(e.currentTarget);
  };
  
  const handleTextareaKeyUp = (e: React.KeyboardEvent < HTMLTextAreaElement > ) => {
    updateCursorPosition(e.currentTarget);
  };
  
  const highlightCode = (code: string): string => {
    // Basic syntax highlighting for common languages
    const patterns = {
      javascript: [
        { regex: /(\/\/.*$)/gm, class: 'comment' },
        { regex: /(\/\*[\s\S]*?\*\/)/gm, class: 'comment' },
        { regex: /(".*?"|'.*?'|`[\s\S]*?`)/gm, class: 'string' },
        { regex: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|import|export|default|from|as)\b/g, class: 'keyword' },
        { regex: /\b(true|false|null|undefined|this)\b/g, class: 'constant' },
        { regex: /\b(\d+\.?\d*)\b/g, class: 'number' },
      ],
      typescript: [
        { regex: /(\/\/.*$)/gm, class: 'comment' },
        { regex: /(\/\*[\s\S]*?\*\/)/gm, class: 'comment' },
        { regex: /(".*?"|'.*?'|`[\s\S]*?`)/gm, class: 'string' },
        { regex: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|import|export|default|from|as|interface|type|namespace|module|declare)\b/g, class: 'keyword' },
        { regex: /\b(true|false|null|undefined|this)\b/g, class: 'constant' },
        { regex: /\b(\d+\.?\d*)\b/g, class: 'number' },
        { regex: /:\s*\w+/g, class: 'type' },
      ],
      python: [
        { regex: /(#.*$)/gm, class: 'comment' },
        { regex: /("""[\s\S]*?"""|'''[\s\S]*?''')/gm, class: 'comment' },
        { regex: /(".*?"|'.*?')/gm, class: 'string' },
        { regex: /\b(def|class|return|if|elif|else|for|while|in|is|and|or|not|import|from|as|with|try|except|finally|lambda)\b/g, class: 'keyword' },
        { regex: /\b(True|False|None)\b/g, class: 'constant' },
        { regex: /\b(\d+\.?\d*)\b/g, class: 'number' },
      ],
      html: [
        { regex: /(&lt;!--[\s\S]*?--&gt;)/gm, class: 'comment' },
        { regex: /(&lt;\/?[a-zA-Z][a-zA-Z0-9]*\b[^&gt;]*&gt;)/g, class: 'tag' },
        { regex: /(\b\w+)=/g, class: 'attribute' },
        { regex: /(".*?"|'.*?')/gm, class: 'string' },
      ],
      css: [
        { regex: /(\/\/.*$)/gm, class: 'comment' },
        { regex: /(\/\*[\s\S]*?\*\/)/gm, class: 'comment' },
        { regex: /(".*?"|'.*?')/gm, class: 'string' },
        { regex: /(\.[a-zA-Z][\w-]*|#[a-zA-Z][\w-]*|[a-zA-Z][\w-]*)\s*{/g, class: 'selector' },
        { regex: /([a-zA-Z-]+)\s*:/g, class: 'property' },
        { regex: /(\d+\.?\d*(px|em|rem|%|s|ms)?)\b/g, class: 'number' },
      ]
    };
    
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    const langPatterns = patterns[language as keyof typeof patterns] || patterns.javascript;
    
    langPatterns.forEach(({ regex, class: className }) => {
      highlighted = highlighted.replace(regex, `<span class="${className}">$1</span>`);
    });
    
    return highlighted;
  };
  
  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);
  
  const themeClasses = {
    dark: 'bg-gray-900 text-gray-100',
    light: 'bg-gray-50 text-gray-800'
  };
  
  const syntaxTheme = {
    dark: {
      keyword: 'text-blue-400',
      string: 'text-green-400',
      comment: 'text-gray-500',
      number: 'text-yellow-400',
      constant: 'text-purple-400',
      tag: 'text-red-400',
      attribute: 'text-orange-400',
      selector: 'text-green-400',
      property: 'text-blue-400',
      type: 'text-teal-400'
    },
    light: {
      keyword: 'text-blue-600',
      string: 'text-green-600',
      comment: 'text-gray-400',
      number: 'text-yellow-600',
      constant: 'text-purple-600',
      tag: 'text-red-600',
      attribute: 'text-orange-600',
      selector: 'text-green-600',
      property: 'text-blue-600',
      type: 'text-teal-600'
    }
  };
  
  return (
    <div className={`code-editor rounded-lg border border-gray-700 overflow-hidden ${themeClasses[theme]} ${className}`}>
      {/* Editor Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b border-gray-700 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium capitalize">{language}</span>
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        </div>
        <div className="text-sm text-gray-400">
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative" style={{ height }}>
        {showLineNumbers && (
          <div className={`absolute left-0 top-0 bottom-0 w-12 border-r ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100'} overflow-hidden select-none z-10`}>
            {lineNumbers.map(line => (
              <div
                key={line}
                className={`text-right pr-3 text-sm font-mono ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                } ${line === cursorPosition.line ? (theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-200 text-blue-600') : ''}`}
              >
                {line}
              </div>
            ))}
          </div>
        )}

        <div className={`relative h-full overflow-auto ${showLineNumbers ? 'pl-12' : ''}`}>
          {/* Syntax Highlighted Background */}
          <pre
            ref={preRef}
            className={`absolute top-0 left-0 w-full h-full p-4 font-mono text-sm whitespace-pre overflow-hidden pointer-events-none ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-white'
            }`}
            dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
          />

          {/* Textarea for Input */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleTextareaKeyUp}
            onClick={handleTextareaClick}
            readOnly={readOnly}
            className={`absolute top-0 left-0 w-full h-full p-4 font-mono text-sm whitespace-pre resize-none outline-none ${
              theme === 'dark' 
                ? 'bg-transparent text-transparent caret-white' 
                : 'bg-transparent text-transparent caret-black'
            } ${showLineNumbers ? 'pl-12' : ''}`}
            spellCheck="false"
            style={{ 
              fontFamily: 'monospace',
              lineHeight: '1.5',
              tabSize: 2
            }}
          />
        </div>
      </div>

      {/* Editor Footer */}
      <div className={`px-4 py-2 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-200'}`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              {lineCount} lines
            </span>
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              {code.length} characters
            </span>
          </div>
          <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            UTF-8
          </div>
        </div>
      </div>

      {/* Syntax Highlighting Styles */}
      <style jsx>{`
        .code-editor {
          font-family: 'Fira Code', 'Courier New', monospace;
        }
        ${Object.entries(syntaxTheme[theme]).map(([className, color]) => `
          .${className} { ${color} }
        `).join('')}
      `}</style>
    </div>
  );
};

export default CodeEditor;