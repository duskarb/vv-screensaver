import { useState, useRef, useEffect } from 'react';
import './App.css';
import KakaoChat from './components/KakaoChat';

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
  const dragOffset = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const [trashHover, setTrashHover] = useState(false);
  const trashRef = useRef(null);

  const startDrag = (clientX, clientY, item, target) => {
    if (inputState.visible) return;

    const rect = target.getBoundingClientRect();
    setDragItem(item);
    dragOffset.current = {
      x: clientX - item.x,
      y: clientY - item.y,
      width: rect.width,
      height: rect.height
    };
  };

  const handleMouseDown = (e, item) => {
    e.stopPropagation(); // Don't trigger background events
    startDrag(e.clientX, e.clientY, item, e.currentTarget);
  };



  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      let newX = clientX - dragOffset.current.x;
      let newY = clientY - dragOffset.current.y;

      const maxX = window.innerWidth - dragOffset.current.width;
      const maxY = window.innerHeight - dragOffset.current.height;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      // Check trash collision
      if (trashRef.current) {
        const trashRect = trashRef.current.getBoundingClientRect();
        const trashCenterX = trashRect.left + trashRect.width / 2;
        const trashCenterY = trashRect.top + trashRect.height / 2;

        const itemCenterX = newX + dragOffset.current.width / 2;
        const itemCenterY = newY + dragOffset.current.height / 2;

        // Distance check (radius 60px for easier detection)
        const distance = Math.sqrt(
          Math.pow(itemCenterX - trashCenterX, 2) +
          Math.pow(itemCenterY - trashCenterY, 2)
        );

        setTrashHover(distance < 60);
      }

      setItems(prev => prev.map(it =>
        it.id === dragItem.id ? { ...it, x: newX, y: newY } : it
      ));
    };

    const handleEnd = (clientX, clientY) => {
      // If dropped on trash
      if (trashHover) {
        remove(ref(db, `items/${dragItem.id}`));
        setDragItem(null);
        setTrashHover(false);
        return;
      }

      let finalX = clientX - dragOffset.current.x;
      let finalY = clientY - dragOffset.current.y;

      const maxX = window.innerWidth - dragOffset.current.width;
      const maxY = window.innerHeight - dragOffset.current.height;

      finalX = Math.max(0, Math.min(finalX, maxX));
      finalY = Math.max(0, Math.min(finalY, maxY));

      update(ref(db, `items/${dragItem.id}`), {
        x: finalX,
        y: finalY
      });
      setDragItem(null);
      setTrashHover(false);
    };

    const onMouseMove = (e) => {
      if (dragItem) handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = (e) => {
      if (dragItem) handleEnd(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragItem, trashHover]);

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

  const saveTimerRef = useRef(null);

  const handleItemWheel = (e, item) => {
    e.stopPropagation();
    // Prevent browser zoom if using trackpad pinch (ctrlKey)
    if (e.ctrlKey) e.preventDefault();

    const delta = Math.sign(e.deltaY); // Scroll down (positive delta) means zoom in
    const currentSize = item.fontSize || 20; // Default 20px
    const newSize = Math.max(10, Math.min(200, currentSize + delta * 2)); // Limit between 10px and 200px

    // 1. Update local state immediately for responsiveness
    setItems(prev => prev.map(it =>
      it.id === item.id ? { ...it, fontSize: newSize } : it
    ));

    // 2. Debounce Firebase update
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      update(ref(db, `items/${item.id}`), {
        fontSize: newSize
      });
      saveTimerRef.current = null;
    }, 500);
  };

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
              animationDelay: `${(item.id % 5000) / -1000}s`, // Deterministic random delay based on ID
              fontSize: `${item.fontSize || 20}px`
            }}
            onDoubleClick={(e) => handleItemDoubleClick(e, item)}
            onMouseDown={(e) => handleMouseDown(e, item)}
            onWheel={(e) => handleItemWheel(e, item)}
            onContextMenu={(e) => e.preventDefault()}
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



      {/* Trash Bin */}
      <div
        ref={trashRef}
        className={`trash-bin ${dragItem ? 'visible' : ''} ${trashHover ? 'active' : ''}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </div>

      <KakaoChat />
    </div>
  );
}

export default App;
