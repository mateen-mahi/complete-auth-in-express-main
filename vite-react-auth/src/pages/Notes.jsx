import { useState, useRef, useEffect, useCallback } from "react";
import {
  FiPlus, FiTrash2, FiSearch, FiFileText,
  FiBold, FiItalic, FiUnderline, FiLink,
  FiList, FiMinus, FiX,
  FiGrid, FiList as FiListIcon,
  FiClock, FiType, FiMoreVertical,
} from "react-icons/fi";
import {
  MdFormatStrikethrough,
  MdFormatQuote,
  MdFormatListNumbered,
  MdUndo,
  MdRedo,
  MdTitle,
} from "react-icons/md";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "../styles/notes.css";

// ─── Helpers ───────────────────────────────────────────────
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const stripHtml = (html) =>
  html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";

// ─── Toolbar Config ────────────────────────────────────────
const TOOLBAR_GROUPS = [
  [
    { cmd: "undo",            icon: MdUndo,                title: "Undo" },
    { cmd: "redo",            icon: MdRedo,                title: "Redo" },
  ],
  [
    { cmd: "heading",         icon: MdTitle,               title: "Heading",      val: "h2" },
    { cmd: "bold",            icon: FiBold,                title: "Bold (Ctrl+B)" },
    { cmd: "italic",          icon: FiItalic,              title: "Italic (Ctrl+I)" },
    { cmd: "underline",       icon: FiUnderline,           title: "Underline (Ctrl+U)" },
    { cmd: "strike",          icon: MdFormatStrikethrough, title: "Strikethrough" },
  ],
  [
    { cmd: "bulletList",      icon: FiList,                title: "Bullet list" },
    { cmd: "orderedList",     icon: MdFormatListNumbered,  title: "Numbered list" },
    { cmd: "blockquote",      icon: MdFormatQuote,         title: "Blockquote" },
  ],
  [
    { cmd: "link",            icon: FiLink,                title: "Insert link" },
    { cmd: "horizontalRule",  icon: FiMinus,               title: "Divider" },
  ],
];

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef(null);

  // ── Fetch notes ───────────────────────────────────────────
  useEffect(() => {
    const fetchNotes = async () => {
      if (!user?._id) {
        setNotes([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.get(`/notes/user/${user._id}`);
        console.log("Notes API response:", res);
        console.log("res.data:", res.data);
        console.log("res.data?.data:", res.data?.data);

        // Handle multiple possible response formats
        let data = null;
        if (Array.isArray(res.data)) {
          data = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          data = res.data.data;
        } else if (res.data && res.data.notes && Array.isArray(res.data.notes)) {
          data = res.data.notes;
        } else if (res.data && typeof res.data === 'object') {
          // Try to find any array property
          const arrKey = Object.keys(res.data).find(k => Array.isArray(res.data[k]));
          if (arrKey) data = res.data[arrKey];
        }

        setNotes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fetch notes error:", err.response?.data || err.message);
        setError("Failed to load notes.");
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [user?._id]);

  // ── TipTap Editor ─────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false, linkOnPaste: true }),
      Placeholder.configure({
        placeholder: "Start writing your note…",
      }),
      Underline,
    ],
    content: "<p></p>",
    autofocus: false,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      setEditingNote((prev) => ({
        ...prev,
        content: html,
        updatedAt: new Date().toISOString(),
      }));
    },
  });

  // Sync editor content when opening a note
  useEffect(() => {
    if (editor && editingNote) {
      if (editor.getHTML() !== (editingNote.content || "<p></p>")) {
        editor.commands.setContent(editingNote.content || "<p></p>");
      }
    }
  }, [editingNote?._id, editor]);

  // ── Toolbar commands ──────────────────────────────────────
  const execCmd = useCallback((cmd, val = null) => {
    if (!editor) return;
    switch (cmd) {
      case "undo":        editor.commands.undo(); break;
      case "redo":        editor.commands.redo(); break;
      case "bold":        editor.commands.toggleBold(); break;
      case "italic":      editor.commands.toggleItalic(); break;
      case "underline":   editor.commands.toggleUnderline(); break;
      case "strike":      editor.commands.toggleStrike(); break;
      case "heading":     editor.commands.toggleHeading({ level: parseInt(val.replace("h", "")) }); break;
      case "bulletList":  editor.commands.toggleBulletList(); break;
      case "orderedList": editor.commands.toggleOrderedList(); break;
      case "blockquote":  editor.commands.toggleBlockquote(); break;
      case "horizontalRule": editor.commands.setHorizontalRule(); break;
      case "link": {
        const url = prompt("Enter URL:", "https://");
        if (url) editor.commands.setLink({ href: url });
        break;
      }
      default: break;
    }
    editor.commands.focus();
  }, [editor]);

  // ── Modal Management ────────────────────────────────────
  const openNewNote = () => {
    const newNote = {
      title: "",
      content: "<p></p>",
      isPinned: false,
      _id: null,
    };
    setTitleDraft("");
    setEditingNote(newNote);
    setModalOpen(true);
    // Focus editor after modal opens
    setTimeout(() => editor?.commands.focus("end"), 100);
  };

  const openEditNote = (note) => {
    setTitleDraft(note.title || "");
    setEditingNote({ ...note });
    setModalOpen(true);
    setTimeout(() => editor?.commands.focus("end"), 100);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingNote(null);
    setTitleDraft("");
    setError(null);
  };

  // ── CRUD Operations ─────────────────────────────────────
  const saveNote = async () => {
    if (!editingNote || isSaving) return;

    const title = titleDraft.trim() || "Untitled note";
    const content = editingNote.content || "<p></p>";
    const plainContent = stripHtml(content);

    if (plainContent.length === 0) {
      setError("Please add some content to your note.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        userId:user._id,
        title,
        content,
        isPinned: editingNote.isPinned || false,
      };

      if (editingNote._id) {
        const res = await api.put(`/notes/${editingNote._id}`, payload);
        const updated = res.data?.data;
        if (updated) {
          setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
        }
      } else {
        const res = await api.post("/notes", payload);
        const created = res.data?.data;
        if (created) {
          setNotes((prev) => [created, ...prev]);
        }
      }
      closeModal();
    } catch (err) {
      console.error("Save note error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to save note.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this note permanently?")) return;
    const original = [...notes];
    setNotes((prev) => prev.filter((n) => n._id !== id));
    try {
      await api.delete(`/notes/${id}`);
    } catch (err) {
      console.error("Delete error:", err.response?.data || err.message);
      setNotes(original);
      setError("Failed to delete note.");
    }
  };

  const togglePin = async (id, e) => {
    e?.stopPropagation();
    const note = notes.find((n) => n._id === id);
    if (!note) return;
    const updated = { ...note, isPinned: !note.isPinned };
    setNotes((prev) =>
      prev.map((n) => (n._id === id ? updated : n)).sort((a, b) => {
        if (a.isPinned === b.isPinned) {
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
        return a.isPinned ? -1 : 1;
      })
    );
    try {
      await api.patch(`/notes/${id}/pin`);
    } catch (err) {
      console.error("Toggle pin error:", err.response?.data || err.message);
      setNotes((prev) => prev.map((n) => (n._id === id ? note : n)));
      setError("Failed to toggle pin.");
    }
  };

  // ── Filtered notes ────────────────────────────────────────
  const safeNotes = Array.isArray(notes) ? notes : [];
  const filteredNotes = safeNotes.filter((n) => {
    const q = search.toLowerCase();
    return (
      (n.title?.toLowerCase() || "").includes(q) ||
      stripHtml(n.content).toLowerCase().includes(q)
    );
  });

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const otherNotes = filteredNotes.filter((n) => !n.isPinned);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="notes-app">
      {/* ═══ HEADER ═══ */}
      <header className="notes-topbar">
        <div className="notes-brand">
          <div className="notes-brand-icon">
            <FiFileText />
          </div>
          <div>
            <h1 className="notes-brand-title">My Notes</h1>
            <p className="notes-brand-count">
              {safeNotes.length} note{safeNotes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="notes-topbar-actions">
          <div className="notes-search-box">
            <FiSearch className="notes-search-icon" />
            <input
              type="text"
              className="notes-search-input"
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="notes-search-clear" onClick={() => setSearch("")}>
                <FiX />
              </button>
            )}
          </div>

          <div className="notes-segmented">
            <button
              className={viewMode === "grid" ? "active" : ""}
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              <FiGrid />
            </button>
            <button
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <FiListIcon />
            </button>
          </div>

          <button className="notes-create-btn" onClick={openNewNote}>
            <FiPlus /> New
          </button>
        </div>
      </header>

      {/* ═══ ERROR BANNER ═══ */}
      {error && (
        <div className="notes-alert">
          <span>{error}</span>
          <button onClick={() => setError(null)}><FiX /></button>
        </div>
      )}

      {/* ═══ NOTES CONTENT ═══ */}
      <main className="notes-main">
        {loading ? (
          <div className="notes-skeleton-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="notes-skeleton-card" />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="notes-empty">
            <div className="notes-empty-illustration">
              <FiFileText />
            </div>
            <h3>{search ? "No matches found" : "No notes yet"}</h3>
            <p>{search ? "Try a different search term" : "Create your first note to get started"}</p>
            {!search && (
              <button className="notes-create-btn-lg" onClick={openNewNote}>
                <FiPlus /> Create Note
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Pinned Section */}
            {pinnedNotes.length > 0 && (
              <section className="notes-section">
                <h2 className="notes-section-label">
                  <span className="notes-pin-dot" /> Pinned
                </h2>
                <div className={`notes-list ${viewMode}`}>
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      onEdit={openEditNote}
                      onDelete={handleDelete}
                      onTogglePin={togglePin}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Other Notes Section */}
            {otherNotes.length > 0 && (
              <section className="notes-section">
                {pinnedNotes.length > 0 && (
                  <h2 className="notes-section-label">Others</h2>
                )}
                <div className={`notes-list ${viewMode}`}>
                  {otherNotes.map((note) => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      onEdit={openEditNote}
                      onDelete={handleDelete}
                      onTogglePin={togglePin}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ═══ EDITOR MODAL ═══ */}
      {modalOpen && (
        <div className="notes-editor-overlay" onClick={closeModal}>
          <div className="notes-editor-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="notes-editor-header">
              <div className="notes-editor-meta">
                <FiType className="notes-editor-meta-icon" />
                <span>{editingNote?._id ? "Editing note" : "New note"}</span>
              </div>
              <button className="notes-editor-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>

            {/* Title Input */}
            <div className="notes-title-field">
              <input
                ref={editorRef}
                type="text"
                className="notes-title-input"
                placeholder="Note title"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                autoFocus
              />
            </div>

            {/* Toolbar */}
            <div className="notes-editor-toolbar">
              {TOOLBAR_GROUPS.map((group, gi) => (
                <div key={gi} className="notes-toolbar-group">
                  {group.map(({ cmd, icon: Icon, title, val }) => (
                    <button
                      key={title}
                      className="notes-toolbar-btn"
                      title={title}
                      onMouseDown={(e) => { e.preventDefault(); execCmd(cmd, val); }}
                    >
                      <Icon />
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Editor Area */}
            <div className="notes-editor-body">
              <EditorContent editor={editor} />
            </div>

            {/* Modal Footer */}
            <div className="notes-editor-footer">
              <div className="notes-editor-stats">
                <span><FiClock /> {editingNote?.updatedAt ? timeAgo(editingNote.updatedAt) : "Just now"}</span>
                <span>•</span>
                <span>{stripHtml(editingNote?.content).split(/\s+/).filter(Boolean).length} words</span>
              </div>

              <div className="notes-editor-footer-actions">
                <label className="notes-pin-switch">
                  <input
                    type="checkbox"
                    checked={editingNote?.isPinned || false}
                    onChange={(e) =>
                      setEditingNote((prev) => ({ ...prev, isPinned: e.target.checked }))
                    }
                  />
                  <span>📌 Pin</span>
                </label>
                <button className="notes-btn-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  className="notes-btn-save"
                  onClick={saveNote}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : editingNote?._id ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Note Card Component ───────────────────────────────────
function NoteCard({ note, onEdit, onDelete, onTogglePin }) {
  const plain = stripHtml(note.content);
  const wordCount = plain.split(/\s+/).filter(Boolean).length;

  return (
    <article
      className={`note-card ${note.isPinned ? "pinned" : ""}`}
      onClick={() => onEdit(note)}
    >
      <div className="note-card-content">
        <h3 className="note-card-title">{note.title || "Untitled"}</h3>
        <p className="note-card-excerpt">{plain.slice(0, 140) || "Empty note"}</p>
      </div>

      <div className="note-card-bottom">
        <div className="note-card-meta">
          <span>{timeAgo(note.updatedAt)}</span>
          <span className="note-card-dot" />
          <span>{wordCount} words</span>
        </div>

        <div className="note-card-actions">
          <button
            className={`note-action-btn ${note.isPinned ? "pinned" : ""}`}
            onClick={(e) => onTogglePin(note._id, e)}
            title={note.isPinned ? "Unpin" : "Pin"}
          >
            📌
          </button>
          <button
            className="note-action-btn delete"
            onClick={(e) => onDelete(note._id, e)}
            title="Delete"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>
    </article>
  );
}