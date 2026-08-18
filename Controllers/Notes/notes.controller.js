import Note from '../../models/notes.model.js';

const handleControllerError = (res, error) => {
  console.error(error);

  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: error.message });
  }

  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

export const createNote = async (req, res) => {
  try {
    const { title, content, isPinned, userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    const newNote = new Note({
      userId,
      title: title.trim() || 'Untitled note',
      content: content || '<p></p>',
      isPinned: isPinned || false,
    });

    await newNote.save();
    res.status(201).json({ success: true, data: newNote });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// Whitelisted sortable fields for getAllNotes. isPinned always leads so
// pinned notes stay on top regardless of the chosen secondary sort.
const NOTE_SORTABLE_FIELDS = {
  title: "title",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

const buildNoteSort = (sortBy, order) => {
  const field = NOTE_SORTABLE_FIELDS[sortBy] || "updatedAt";
  const direction = order === "asc" ? 1 : -1;
  return { isPinned: -1, [field]: direction };
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// isPinned filter is intentionally separate from the always-pinned-first
// sort above — this lets the frontend show ONLY pinned or ONLY unpinned
// notes when needed (e.g. a dedicated "Pinned" tab).
const buildNoteFilter = (query) => {
  const filter = {};
  if (query.isPinned === "true") filter.isPinned = true;
  if (query.isPinned === "false") filter.isPinned = false;
  if (query.search && query.search.trim()) {
    filter.title = { $regex: escapeRegex(query.search.trim()), $options: "i" };
  }
  return filter;
};

// ─── GET ALL NOTES (admin or public) ──────────────────────
// Returns all notes in the system – can be restricted later.
export const getAllNotes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const sort = buildNoteSort(req.query.sortBy, req.query.order);
    const filter = buildNoteFilter(req.query);

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Note.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: notes,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── GET NOTE BY ID ─────────────────────────────────────────
export const getNoteById = async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await Note.findById(noteId).lean();

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      });
    }

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    return handleControllerError(res, error);
  }
};



// ─── UPDATE NOTE ────────────────────────────────────────────
export const updateNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { title, content, isPinned} = req.body;


    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) updateFields.content = content;
    if (isPinned !== undefined) updateFields.isPinned = isPinned;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (title, content, isPinned) must be provided',
      });
    }

    const updatedNote = await Note.findOneAndUpdate(
      { _id: noteId},
      updateFields,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedNote) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or you do not have access',
      });
    }

    res.status(200).json({ success: true, data: updatedNote });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── DELETE NOTE ────────────────────────────────────────────
export const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    const deletedNote = await Note.findOneAndDelete({ _id: noteId });

    if (!deletedNote) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or you do not have access',
      });
    }

    res.status(200).json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── TOGGLE PIN ─────────────────────────────────────────────
export const togglePinNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await Note.findOne({ _id: noteId});
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or you do not have access',
      });
    }

    note.isPinned = !note.isPinned;
    await note.save();

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── GET NOTES BY USER ID ──────────────────────────────────
export const getNotesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const sort = buildNoteSort(req.query.sortBy, req.query.order);
    const filter = { userId, ...buildNoteFilter(req.query) };

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Note.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: notes,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};