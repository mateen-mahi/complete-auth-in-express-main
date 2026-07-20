import express from 'express';
import {
    createNote,
    getAllNotes,
    getNoteById,
    updateNote,
    deleteNote,
    togglePinNote,
    getNotesByUserId,
} from '../Controllers/Notes/notes.controller.js';
const notesRouter = express.Router();


notesRouter.post('/', createNote);
// GET /api/v1/notes?page=1&limit=20
notesRouter.get('/', getAllNotes);
notesRouter.get('/user/:userId', getNotesByUserId);
notesRouter.get('/:noteId', getNoteById);

notesRouter.put('/:noteId', updateNote);
notesRouter.delete('/:noteId', deleteNote);
notesRouter.patch('/:noteId/pin', togglePinNote);

export default notesRouter;