import { useState, useRef, useEffect } from 'react';
import './App.css';

import { db } from './firebase';
import { ref, onValue, push, update, remove } from 'firebase/database';

function App() {
  const [items, setItems] = useState([]);
  const [inputState, setInputState] = useState({
    visible: false,
    x: 0,
    y: 0,
    value: '',
    editId: null
  });
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const inputRef = useRef(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = (e) => {
    e.stopPropagation(); // Don't trigger input
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Firebase connection
  useEffect(() => {
    const itemsRef = ref(db, 'items/');
    const unsubscribe = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const itemList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        setItems(itemList);
      } else {
        setItems([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Idle detection
  useEffect(() => {
    const resetIdle = () => {
      setIsIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        // Only go idle if not currently typing
        if (!inputState.visible) {
          setIsIdle(true);
        }
      }, 3000); // 3 seconds idle time
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('click', resetIdle);

    // Init timer
    resetIdle();

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('click', resetIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [inputState.visible]);

  // Focus input when it appears
  useEffect(() => {
    if (inputState.visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputState.visible]);

  const handleDoubleClick = (e) => {
    // Prevent triggering if clicking on existing item is handled by bubble/propagation
    // But since we put onDoubleClick on the item too, stopPropagation there handles it.
    if (e.target.closest('.text-item')) return;

    setInputState({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      value: '',
      editId: null
    });
  };

  const handleItemDoubleClick = (e, item) => {
    e.stopPropagation();
    setInputState({
      visible: true,
      x: item.x,
      y: item.y,
      value: item.text,
      editId: item.id
    });
  };

  // Drag state
  const [dragItem, setDragItem] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e, item) => {
    e.stopPropagation(); // Don't trigger background events
    if (inputState.visible) return; // Don't drag if editing somewhere

    setDragItem(item);
    dragOffset.current = {
      x: e.clientX - item.x,
      y: e.clientY - item.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragItem) return;

      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      // Optimistic update locally
      setItems(prev => prev.map(it =>
        it.id === dragItem.id ? { ...it, x: newX, y: newY } : it
      ));
    };

    const handleMouseUp = (e) => {
      if (!dragItem) return;

      // Final save to Firebase
      const finalX = e.clientX - dragOffset.current.x;
      const finalY = e.clientY - dragOffset.current.y;

      update(ref(db, `items/${dragItem.id}`), {
        x: finalX,
        y: finalY
      });

      setDragItem(null);
    };

    if (dragItem) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragItem]);

  const commitText = () => {
    const trimmed = inputState.value.trim();
    if (trimmed) {
      if (inputState.editId) {
        // Update existing item via Firebase
        update(ref(db, `items/${inputState.editId}`), {
          text: trimmed
        });
      } else {
        // Create new item via Firebase
        push(ref(db, 'items/'), {
          x: inputState.x,
          y: inputState.y,
          text: trimmed,
          createdAt: Date.now()
        });
      }
    } else {
      // If text is empty and we were editing, delete the item via Firebase
      if (inputState.editId) {
        remove(ref(db, `items/${inputState.editId}`));
      }
    }
    setInputState(prev => ({ ...prev, visible: false, value: '', editId: null }));
  };

  const handleKeyDown = (e) => {
    // Save on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitText();
    }
    // Escape to cancel (or just close)
    if (e.key === 'Escape') {
      setInputState(prev => ({ ...prev, visible: false, value: '', editId: null }));
    }
  };

  // Auto-resize textarea height
  useEffect(() => {
    if (inputState.visible && inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [inputState.value, inputState.visible]);

  return (
    <div
      className={`app-container ${isIdle ? 'idle' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
      </button>

      {items.map(item => {
        // Hide the item if it's currently being edited so it doesn't overlap with the input
        if (item.id === inputState.editId) return null;

        return (
          <div
            key={item.id}
            className="text-item"
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              animationDelay: `${(item.id % 5000) / -1000}s` // Deterministic random delay based on ID
            }}
            onDoubleClick={(e) => handleItemDoubleClick(e, item)}
            onMouseDown={(e) => handleMouseDown(e, item)}
          >
            {item.text}
          </div>
        );
      })}

      {inputState.visible && (
        <textarea
          ref={inputRef}
          className="floating-input"
          style={{
            left: `${inputState.x}px`,
            top: `${inputState.y}px`
          }}
          value={inputState.value}
          onChange={(e) => setInputState(prev => ({ ...prev, value: e.target.value }))}
          onKeyDown={handleKeyDown}
          onBlur={commitText}
          placeholder="Type here..."
          rows={1}
        />
      )}

      <div className="hint">Double click to add text.</div>
    </div>
  );
}

export default App;
