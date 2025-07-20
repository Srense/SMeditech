import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import "./FloatingGuide.css"; // Import the separate CSS file

const SOCKET_URL = "http://localhost:5000"; // Change if backend is hosted elsewhere

// Added loggedInUsername prop to receive the user's name
function FloatingGuide({ loggedInUsername = "Guest" }) { // Default to "Guest" if no username is provided
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false); // State to manage chat window visibility
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const chatWindowRef = useRef(null); // Ref for the draggable chat window

  // State for dragging
  const [isDragging, setIsDragging] = useState(false);
  // Initial position (bottom-right) - calculate dynamically to ensure it's always within view
  const [position, setPosition] = useState(() => ({
    x: window.innerWidth - 370, // Corresponds to original 350px width + some margin
    y: window.innerHeight - 470  // Corresponds to original 450px height + some margin
  }));
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // Offset from mouse click to element corner

  // The username for this client will now be the loggedInUsername prop
  // const username = "User" + Math.floor(Math.random() * 1000); // Removed, now using loggedInUsername prop

  // Initialize Socket.IO and set up message listener
  useEffect(() => {
    socketRef.current = io(SOCKET_URL + "/chat");

    socketRef.current.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    // Clean up socket connection on component unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Scroll to the latest message whenever messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]); // Also scroll when chat opens

  // Handle window resize to adjust initial position if needed
  useEffect(() => {
    const handleResize = () => {
      setPosition(prevPos => ({
        x: Math.min(prevPos.x, window.innerWidth - (chatWindowRef.current?.offsetWidth || 350)), // Use original width from CSS
        y: Math.min(prevPos.y, window.innerHeight - (chatWindowRef.current?.offsetHeight || 450)) // Use original height from CSS
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle message sending
  const sendMessage = () => {
    if (input.trim()) {
      const newMsg = {
        text: input,
        username: loggedInUsername, // Use the loggedInUsername prop here
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // Format timestamp
      };
      socketRef.current.emit("send_message", newMsg);
      setMessages((prev) => [...prev, newMsg]); // Optimistically add message to UI
      setInput("");
    }
  };

  // Draggable functionality handlers
  const handleMouseDown = useCallback((e) => {
    // Check if the click target is an interactive element (input, button, close button)
    // If it is, we don't want to start dragging, so return early.
    const targetTagName = e.target.tagName;
    if (targetTagName === 'INPUT' || targetTagName === 'BUTTON' || e.target.closest('.close-button')) {
      return;
    }

    // Allow dragging from the toggle button
    if (e.currentTarget.classList.contains('floating-chat-toggle-button')) {
      setIsDragging(true);
      const targetElement = e.currentTarget;
      setOffset({
        x: e.clientX - targetElement.getBoundingClientRect().left,
        y: e.clientY - targetElement.getBoundingClientRect().top,
      });
      e.preventDefault(); // Prevent text selection
      return;
    }

    // If chat window is open, allow dragging from any point within the window
    if (isOpen && chatWindowRef.current) {
      setIsDragging(true);
      setOffset({
        x: e.clientX - chatWindowRef.current.getBoundingClientRect().left,
        y: e.clientY - chatWindowRef.current.getBoundingClientRect().top,
      });
      e.preventDefault(); // Prevent text selection
    }
  }, [isOpen]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    // Calculate new position based on mouse movement and initial offset
    let newX = e.clientX - offset.x;
    let newY = e.clientY - offset.y;

    // Get current dimensions of the draggable element
    const currentWidth = chatWindowRef.current?.offsetWidth || 350; // Use original width from CSS
    const currentHeight = chatWindowRef.current?.offsetHeight || 450; // Use original height from CSS

    // Boundary checks to keep the window within the viewport
    const maxX = window.innerWidth - currentWidth;
    const maxY = window.innerHeight - currentHeight;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    setPosition({ x: newX, y: newY });
  }, [isDragging, offset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add and remove global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Initial position for the button when closed
  const buttonPosition = { x: window.innerWidth - 90, y: window.innerHeight - 90 };

  return (
    <>
      {/* Floating Chat Button (when chat is closed) */}
      {!isOpen && (
        <div
          className="floating-chat-toggle-button"
          onClick={() => setIsOpen(true)}
          onMouseDown={handleMouseDown} // Make the button draggable too
          style={{ left: `${buttonPosition.x}px`, top: `${buttonPosition.y}px` }}
        >
          {/* Chat icon (e.g., from Lucide React or simple SVG) */}
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
        </div>
      )}

      {/* Floating Chat Window (when chat is open) */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          className="floating-guide-chat"
          // Attach onMouseDown to the entire chat window for dragging
          onMouseDown={handleMouseDown}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab', // Change cursor during drag
          }}
        >
          {/* Chat Header - Drag Handle & Close Button */}
          <div
            // Removed 'drag-handle' class from here as the whole window is draggable
            className={`chat-header ${isDragging ? 'dragging' : ''}`}
            // onMouseDown is now on the parent div, so no need here
          >
            Support Chat
            <button
              onClick={() => setIsOpen(false)}
              className="close-button"
            >
              {/* Close icon (X) */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Body - Message Display Area */}
          <div className="chat-body">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-message ${msg.username === loggedInUsername ? 'self-message' : ''}`}
              >
                {/* Display "You" if it's the current user, otherwise display the message's username */}
                <b>{msg.username === loggedInUsername ? "You" : msg.username}:</b> {msg.text}
                <span>{msg.timestamp}</span>
              </div>
            ))}
            <div ref={messagesEndRef} /> {/* Scroll target */}
          </div>

          {/* Chat Footer - Input and Send Button */}
          <div className="chat-footer">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingGuide;
