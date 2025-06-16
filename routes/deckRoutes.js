
const express = require('express');
const { createDeck,getDecks,updateDeck,deleteDeck, getDeckById, getUserProfile, getPublicDecks, getLearningContribution, upvoteDeck, copyDeck, addComment, getComments, getUpvoteCount, getNearestReviewDeck} = require('../controllers/deckController/deck');
const authMiddleware = require('../middlewares/auth.middleware'); 
const router = express.Router();

//users act
router.get('/profile', authMiddleware, getUserProfile);
router.get('/contributions', authMiddleware, getLearningContribution);

//deck manage
router.post('/createDeck', authMiddleware, createDeck); 
router.get('/getAllDeck', authMiddleware, getDecks); 
router.get('/getDeck/:deckId', authMiddleware, getDeckById);
router.put('/editDeck/:id', authMiddleware, updateDeck); 
router.delete('/hapusDeck/:id', authMiddleware, deleteDeck);
router.get('/decks/nearest-review', authMiddleware, getNearestReviewDeck);
router.get('/public', getPublicDecks);
router.post('/decks/:id/upvote', authMiddleware, upvoteDeck);
router.get('/decks/:id/upvotes', getUpvoteCount);
router.post('/decks/:id/copy', authMiddleware, copyDeck);
router.post('/decks/:id/comment', authMiddleware, addComment);
router.get('/decks/:id/comments', getComments);

module.exports = router;
