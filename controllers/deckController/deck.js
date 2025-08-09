const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getDecks = async (req, res) => {
  try {
    // Get userId from authMiddleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Fetch decks for the user with flashcard count and progress data
    const decks = await prisma.deck.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            flashcards: true,
          },
        },
        flashcards: {
          select: {
            id: true,
            history: {
              where: { userId },
              orderBy: { createdAt: "desc" },
              take: 1, // Get only the most recent history for each flashcard
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    // Transform the response to include flashcardCount and progress percentage
    const formattedDecks = decks.map((deck) => {
      const totalFlashcards = deck._count.flashcards;

      // Count mastered and needs review flashcards
      let masteredCount = 0;
      let needsReviewCount = 0;

      deck.flashcards.forEach((flashcard) => {
        if (flashcard.history.length > 0) {
          if (flashcard.history[0].status === "MASTERED") {
            masteredCount++;
          } else if (flashcard.history[0].status === "NEEDS_REVIEW") {
            needsReviewCount++;
          }
        }
      });

      // Calculate progress percentage
      const progressPercentage =
        totalFlashcards > 0
          ? Math.round((masteredCount / totalFlashcards) * 100)
          : 0;

      return {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        category: deck.category,
        isPublic: deck.isPublic,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
        flashcardCount: totalFlashcards,
        progress: {
          percentage: progressPercentage,
          mastered: masteredCount,
          needsReview: needsReviewCount,
          total: totalFlashcards,
        },
      };
    });

    res.status(200).json({
      message: "Decks retrieved successfully",
      totalDecks: formattedDecks.length, // Tambahkan ini
      decks: formattedDecks,
    });
  } catch (error) {
    console.error("Error fetching decks:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

const getDeckById = async (req, res) => {
  try {
    // Get userId from authMiddleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Get deckId from request parameters
    const { deckId } = req.params;

    // Validate deckId
    if (!deckId) {
      return res.status(400).json({ error: "Deck ID is required" });
    }

    // Fetch the specific deck
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        userId: true, // To verify ownership
      },
    });

    // Check if deck exists
    if (!deck) {
      return res.status(404).json({ error: "Deck not found" });
    }

    // Verify user has access (either owns the deck or it's public)
    if (deck.userId !== userId && !deck.isPublic) {
      return res
        .status(403)
        .json({ error: "Unauthorized access to this deck" });
    }

    res.status(200).json({ message: "Deck retrieved successfully", deck });
  } catch (error) {
    console.error("Error fetching deck:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

const getUserProfile = async (req, res) => {
  try {
    // Get userId from authMiddleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Fetch user profile with related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        decks: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        analytics: {
          select: {
            id: true,
            category: true,
            performance: true,
            weakAreas: true,
            recommendations: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User profile retrieved successfully", user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};
// Add to your router
// controllers/contributionController.js

const getLearningContribution = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Hitung aktivitas per hari dalam 1 tahun terakhir
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Pertama, ambil semua data history
    const allHistory = await prisma.history.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: oneYearAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Kelompokkan per hari
    const dailyCounts = allHistory.reduce((acc, { createdAt }) => {
      const dateStr = createdAt.toISOString().split("T")[0]; // Format YYYY-MM-DD
      acc[dateStr] = (acc[dateStr] || 0) + 1;
      return acc;
    }, {});

    // Format data untuk response
    const contributionData = Object.entries(dailyCounts).map(
      ([date, count]) => ({
        date,
        count,
        level: calculateContributionLevel(count),
      })
    );

    // Isi hari-hari yang tidak ada aktivitas dengan count 0
    const fullYearData = fillEmptyDays(contributionData, oneYearAgo);

    res.status(200).json({
      contributionData: fullYearData,
      message: "Contribution calendar data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching contribution calendar:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function untuk menentukan level warna
function calculateContributionLevel(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

// Helper function untuk mengisi hari yang tidak ada aktivitas
function fillEmptyDays(data, startDate) {
  const result = [];
  const endDate = new Date();
  const currentDate = new Date(startDate);

  // Buat Map untuk data yang ada
  const existingData = new Map();
  data.forEach((item) => existingData.set(item.date, item));

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const existingItem = existingData.get(dateStr);

    if (existingItem) {
      result.push(existingItem);
    } else {
      result.push({
        date: dateStr,
        count: 0,
        level: 0,
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

const createDeck = async (req, res) => {
  try {
    const { name, description, category, isPublic } = req.body;

    // Validate input
    if (!name || !category) {
      return res.status(400).json({ error: "Name and category are required" });
    }

    // Get userId from authMiddleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Create the deck
    const deck = await prisma.deck.create({
      data: {
        name,
        description: description || null, // Handle optional description
        category,
        isPublic: isPublic || false,
        userId,
      },
    });

    res.status(201).json({ message: "Deck created successfully", deck });
  } catch (error) {
    console.error("Error creating deck:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

const updateDeck = async (req, res) => {
  try {
    const { id } = req.params; // Deck ID from URL
    const { name, description, category, isPublic } = req.body;

    // Validate input (at least one field to update)
    if (!name && !category && isPublic === undefined) {
      return res.status(400).json({
        error:
          "At least one field (name, category, or isPublic) is required to update",
      });
    }

    // Get userId from authMiddleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Check if the deck exists and belongs to the user
    const deck = await prisma.deck.findUnique({
      where: { id },
    });
    if (!deck) {
      return res.status(404).json({ error: "Deck not found" });
    }
    if (deck.userId !== userId) {
      return res
        .status(403)
        .json({ error: "You are not authorized to update this deck" });
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    // Update the deck
    const updatedDeck = await prisma.deck.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res
      .status(200)
      .json({ message: "Deck updated successfully", deck: updatedDeck });
  } catch (error) {
    console.error("Error updating deck:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

const deleteDeck = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Validate inputs
    if (!id) return res.status(400).json({ error: "Deck ID is required" });
    if (!userId)
      return res.status(401).json({ error: "User not authenticated" });

    // Verify deck ownership
    const deck = await prisma.deck.findUnique({ where: { id } });
    if (!deck) return res.status(404).json({ error: "Deck not found" });
    if (deck.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this deck" });
    }

    // Delete in proper order to respect foreign key constraints
    await prisma.$transaction([
      // 1. Delete progress records (references flashcards)
      prisma.progress.deleteMany({
        where: { flashcard: { deckId: id } },
      }),
      // 2. Delete history records (references flashcards or deck)
      prisma.history.deleteMany({
        where: { OR: [{ flashcard: { deckId: id } }, { deckId: id }] },
      }),
      // 4. Delete upvote records (references deck)
      prisma.upvote.deleteMany({
        where: { deckId: id },
      }),
      // 5. Delete comment records (references deck)
      prisma.comment.deleteMany({
        where: { deckId: id },
      }),
      // 6. Delete flashcards
      prisma.flashcard.deleteMany({
        where: { deckId: id },
      }),
      // 7. Finally delete the deck
      prisma.deck.delete({
        where: { id },
      }),
    ]);

    res.status(200).json({ message: "Deck deleted successfully" });
  } catch (error) {
    console.error("Error deleting deck:", error);
    res.status(500).json({
      error: "Failed to delete deck",
      details: error.message,
    });
  }
};

const getNearestReviewDeck = async (req, res) => {
  try {
    // Get userId from authMiddleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Find the progress entry with the nearest nextReview date for the user
    const nearestProgress = await prisma.progress.findFirst({
      where: {
        userId,
        isLearned: false, // Exclude learned flashcards
      },
      orderBy: [
        { nextReview: "asc" }, // Sort by nextReview date ascending
        { id: "asc" }, // Ensure deterministic result if dates are equal
      ],
      include: {
        flashcard: {
          select: {
            id: true,
            question: true,
            answer: true,
            imageUrl: true,
            audioUrl: true,
            tags: true,
            difficulty: true,
            deck: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
                isPublic: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    // If no flashcard is found (e.g., new user)
    if (!nearestProgress) {
      return res.status(200).json({
        message: "No flashcards available for review",
        data: null,
      });
    }

    const deck = nearestProgress.flashcard.deck;

    // Fetch additional progress stats for the deck
    const deckProgress = await prisma.progress.aggregate({
      where: {
        userId,
        flashcard: {
          deckId: deck.id,
        },
      },
      _count: {
        flashcardId: true,
      },
      _sum: {
        correctReviews: true,
        totalReviews: true,
      },
    });

    // Prepare response data
    const response = {
      deck: {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        category: deck.category,
        isPublic: deck.isPublic,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
      },
      nearestReview: {
        flashcard: {
          id: nearestProgress.flashcard.id,
          question: nearestProgress.flashcard.question,
          answer: nearestProgress.flashcard.answer,
          imageUrl: nearestProgress.flashcard.imageUrl,
          audioUrl: nearestProgress.flashcard.audioUrl,
          tags: nearestProgress.flashcard.tags,
          difficulty: nearestProgress.flashcard.difficulty,
        },
        nextReview: nearestProgress.nextReview,
        easeFactor: nearestProgress.easeFactor,
        interval: nearestProgress.interval,
        repetitions: nearestProgress.repetitions,
      },
      progressStats: {
        totalFlashcards: deckProgress._count.flashcardId,
        totalReviews: deckProgress._sum.totalReviews || 0,
        correctReviews: deckProgress._sum.correctReviews || 0,
        performance:
          deckProgress._sum.totalReviews > 0
            ? ((deckProgress._sum.correctReviews || 0) /
                deckProgress._sum.totalReviews) *
              100
            : 0,
      },
    };

    return res.status(200).json({
      message: "Nearest review deck retrieved successfully",
      data: response,
    });
  } catch (error) {
    console.error("Error fetching nearest review deck:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  } finally {
    await prisma.$disconnect();
  }
};

const getPublicDecks = async (req, res) => {
  try {
    // Fetch all public decks with creator, flashcard count, upvote count, and comment count
    const decks = await prisma.deck.findMany({
      where: {
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true, // Creator's name
          },
        },
        flashcards: {
          select: {
            id: true, // Only select id to count flashcards
          },
        },
        Upvote: {
          select: {
            id: true, // Only select id to count upvotes
          },
        },
        Comment: {
          select: {
            id: true, // Only select id to count comments
          },
        },
      },
      orderBy: [
        { updatedAt: "desc" }, // Primary sort: most recently updated
        { Upvote: { _count: "desc" } }, // Secondary sort: most upvotes
        { Comment: { _count: "desc" } }, // Tertiary sort: most comments
      ],
    });

    if (!decks || decks.length === 0) {
      return res.status(404).json({ error: "No public decks found" });
    }

    // Format response
    const formattedDecks = decks.map((deck) => ({
      id: deck.id,
      name: deck.name,
      description: deck.description || "No description provided",
      category: deck.category,
      creatorName: deck.user.name,
      flashcardCount: deck.flashcards.length,
      upvoteCount: deck.Upvote.length, // Updated to match schema
      commentCount: deck.Comment.length, // Updated to match schema
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    }));

    res.status(200).json({
      message: "Public decks retrieved successfully",
      totalDecks: formattedDecks.length, // <- menambah total decks
      decks: formattedDecks,
    });
  } catch (error) {
    console.error("Error fetching public decks:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

// Upvote a deck
const upvoteDeck = async (req, res) => {
  try {
    const { id } = req.params; // Deck ID
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Check if deck exists and is public
    const deck = await prisma.deck.findUnique({
      where: { id },
    });
    if (!deck) {
      return res.status(404).json({ error: "Deck not found" });
    }
    if (!deck.isPublic) {
      return res.status(403).json({ error: "Deck is not public" });
    }

    // Check if user already upvoted
    const existingUpvote = await prisma.upvote.findUnique({
      where: {
        userId_deckId: { userId, deckId: id },
      },
    });

    let action;
    if (existingUpvote) {
      // If upvote exists, remove it
      await prisma.upvote.delete({
        where: {
          userId_deckId: { userId, deckId: id },
        },
      });
      action = "removed";
    } else {
      // If upvote doesn't exist, create it
      await prisma.upvote.create({
        data: {
          userId,
          deckId: id,
        },
      });
      action = "added";
    }

    // Get updated upvote count
    const upvoteCount = await prisma.upvote.count({
      where: { deckId: id },
    });

    res.status(200).json({
      message: `Upvote ${action}`,
      upvoteCount,
      isUpvoted: action === "added",
    });
  } catch (error) {
    console.error("Error toggling upvote:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

const getUpvoteCount = async (req, res) => {
  try {
    const { id } = req.params; // Deck ID

    // Check if deck exists and is public
    const deck = await prisma.deck.findUnique({
      where: { id },
    });
    if (!deck) {
      return res.status(404).json({ error: "Deck not found" });
    }
    if (!deck.isPublic) {
      return res.status(403).json({ error: "Deck is not public" });
    }

    // Get upvote count
    const upvoteCount = await prisma.upvote.count({
      where: { deckId: id },
    });

    res.status(200).json({ upvoteCount });
  } catch (error) {
    console.error("Error fetching upvote count:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

// Copy a public deck to user's private deck
const copyDeck = async (req, res) => {
  try {
    const { id } = req.params; // Public deck ID
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Check if deck exists and is public
    const publicDeck = await prisma.deck.findUnique({
      where: { id },
      include: { flashcards: true },
    });
    if (!publicDeck) {
      return res.status(404).json({ error: "Deck not found" });
    }
    if (!publicDeck.isPublic) {
      return res.status(403).json({ error: "Deck is not public" });
    }

    // Create a new private deck for the user
    const newDeck = await prisma.deck.create({
      data: {
        name: `${publicDeck.name} (Copy)`,
        description: publicDeck.description,
        category: publicDeck.category,
        isPublic: false,
        userId,
        flashcards: {
          create: publicDeck.flashcards.map((flashcard) => ({
            question: flashcard.question,
            answer: flashcard.answer,
            imageUrl: flashcard.imageUrl,
            audioUrl: flashcard.audioUrl,
            aiGenerated: flashcard.aiGenerated,
            tags: flashcard.tags,
            difficulty: flashcard.difficulty,
          })),
        },
      },
      include: { flashcards: true },
    });

    res
      .status(201)
      .json({ message: "Deck copied successfully", deck: newDeck });
  } catch (error) {
    console.error("Error copying deck:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

// Add a comment to a deck
const addComment = async (req, res) => {
  try {
    const { id } = req.params; // Deck ID
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    // Check if deck exists and is public
    const deck = await prisma.deck.findUnique({
      where: { id },
    });
    if (!deck) {
      return res.status(404).json({ error: "Deck not found" });
    }
    if (!deck.isPublic) {
      return res.status(403).json({ error: "Deck is not public" });
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        userId,
        deckId: id,
        content,
      },
      include: {
        user: { select: { name: true } }, // Include user's name for display
      },
    });

    res.status(201).json({ message: "Comment added successfully", comment });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

// Get comments for a deck
const getComments = async (req, res) => {
  try {
    const { id } = req.params; // Deck ID

    // Check if deck exists and is public
    const deck = await prisma.deck.findUnique({
      where: { id },
    });
    if (!deck) {
      return res.status(404).json({ error: "Deck not found" });
    }
    if (!deck.isPublic) {
      return res.status(403).json({ error: "Deck is not public" });
    }

    // Get comments with user info
    const comments = await prisma.comment.findMany({
      where: { deckId: id },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

// Create a new deck group
const createDeckGroup = async (req, res) => {
  try {
    const { name, description, deckIds, isPublic } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Validasi deckIds jika ada
    if (deckIds && !Array.isArray(deckIds)) {
      return res.status(400).json({ error: "deckIds must be an array" });
    }

    // Cek apakah semua deck yang dimasukkan ada dan milik user
    if (deckIds && deckIds.length > 0) {
      const decks = await prisma.deck.findMany({
        where: {
          id: { in: deckIds },
          userId,
        },
      });
      if (decks.length !== deckIds.length) {
        return res.status(400).json({ error: "One or more decks are invalid or not owned by user" });
      }
    }

    const deckGroup = await prisma.deckGroup.create({
      data: {
        name,
        description,
        isPublic: isPublic || false,
        userId,
        decks: deckIds ? { connect: deckIds.map(id => ({ id })) } : undefined,
      },
      include: { decks: true },
    });

    return res.status(201).json({
      message: "Deck group created successfully",
      deckGroup,
    });
  } catch (error) {
    console.error("Error creating deck group:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get all deck groups for a user
const getDeckGroups = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const deckGroups = await prisma.deckGroup.findMany({
      where: { userId },
      include: { decks: { include: { flashcards: true } } },
    });

    return res.status(200).json({
      message: "Deck groups retrieved successfully",
      deckGroups,
    });
  } catch (error) {
    console.error("Error retrieving deck groups:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get a specific deck group by ID
const getDeckGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const deckGroup = await prisma.deckGroup.findUnique({
      where: { id },
      include: { decks: { include: { flashcards: true } } },
    });

    if (!deckGroup) {
      return res.status(404).json({ error: "Deck group not found" });
    }

    if (deckGroup.userId !== userId && !deckGroup.isPublic) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.status(200).json({
      message: "Deck group retrieved successfully",
      deckGroup,
    });
  } catch (error) {
    console.error("Error retrieving deck group:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Update a deck group
const updateDeckGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, deckIds, isPublic } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const deckGroup = await prisma.deckGroup.findUnique({
      where: { id },
    });

    if (!deckGroup) {
      return res.status(404).json({ error: "Deck group not found" });
    }

    if (deckGroup.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validasi deckIds jika ada
    if (deckIds && !Array.isArray(deckIds)) {
      return res.status(400).json({ error: "deckIds must be an array" });
    }

    // Cek apakah semua deck yang dimasukkan ada dan milik user
    if (deckIds && deckIds.length > 0) {
      const decks = await prisma.deck.findMany({
        where: {
          id: { in: deckIds },
          userId,
        },
      });
      if (decks.length !== deckIds.length) {
        return res.status(400).json({ error: "One or more decks are invalid or not owned by user" });
      }
    }

    const updatedDeckGroup = await prisma.deckGroup.update({
      where: { id },
      data: {
        name: name || deckGroup.name,
        description: description !== undefined ? description : deckGroup.description,
        isPublic: isPublic !== undefined ? isPublic : deckGroup.isPublic,
        decks: deckIds ? { set: deckIds.map(id => ({ id })) } : undefined,
      },
      include: { decks: true },
    });

    return res.status(200).json({
      message: "Deck group updated successfully",
      deckGroup: updatedDeckGroup,
    });
  } catch (error) {
    console.error("Error updating deck group:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a deck group
const deleteDeckGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const deckGroup = await prisma.deckGroup.findUnique({
      where: { id },
    });

    if (!deckGroup) {
      return res.status(404).json({ error: "Deck group not found" });
    }

    if (deckGroup.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.deckGroup.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Deck group deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting deck group:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getDecks,
  getDeckById,
  getUserProfile,
  getLearningContribution,
  createDeck,
  updateDeck,
  deleteDeck,
  getNearestReviewDeck,
  getPublicDecks,
  upvoteDeck,
  getUpvoteCount,
  copyDeck,
  addComment,
  getComments,
  createDeckGroup,
  getDeckGroups,
  getDeckGroupById,
  updateDeckGroup,
  deleteDeckGroup,
};
