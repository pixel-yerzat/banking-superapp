import { Request, Response } from "express";
import * as cardService from "../services/card.service";
import * as accountService from "../services/account.service";
import { CardType, PaymentSystem } from "../types";
import logger from "../utils/logger";
import { maskCardNumber } from "../utils/generators";

/**
 * Создание новой карты
 * POST /api/v1/cards
 */
export const createCard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User not authenticated",
      });
      return;
    }

    const {
      account_id,
      card_type,
      payment_system,
      daily_limit,
      monthly_limit,
    } = req.body;

    // Проверяем принадлежность счета
    const isOwner = await accountService.isAccountOwner(
      account_id,
      req.user.userId
    );

    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have access to this account",
      });
      return;
    }

    const card = await cardService.createCard(req.user.userId, {
      account_id,
      card_type,
      payment_system,
      daily_limit,
      monthly_limit,
    });

    // Маскируем номер карты в ответе
    const responseCard = {
      ...card,
      card_number_masked: maskCardNumber(card.card_number),
    };

    // Удаляем полный номер и CVV из ответа
    delete (responseCard as any).card_number;
    delete (responseCard as any).cvv_hash;

    res.status(201).json({
      success: true,
      message: "Card created successfully",
      data: responseCard,
    });
  } catch (error) {
    logger.error("Create card controller error:", error);

    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: "Card Creation Failed",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to create card",
    });
  }
};

/**
 * Получение всех карт пользователя
 * GET /api/v1/cards
 */
export const getUserCards = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User not authenticated",
      });
      return;
    }

    const cards = await cardService.getUserCards(req.user.userId);

    // Маскируем номера карт
    const maskedCards = cards.map((card) => ({
      ...card,
      card_number_masked: maskCardNumber(card.card_number),
      card_number: undefined,
      cvv_hash: undefined,
    }));

    res.status(200).json({
      success: true,
      data: maskedCards,
    });
  } catch (error) {
    logger.error("Get user cards controller error:", error);

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to get cards",
    });
  }
};

/**
 * Получение карты по ID
 * GET /api/v1/cards/:cardId
 */
export const getCardById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User not authenticated",
      });
      return;
    }

    const { cardId } = req.params;

    // Проверяем принадлежность карты
    const isOwner = await cardService.isCardOwner(cardId, req.user.userId);

    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have access to this card",
      });
      return;
    }

    const card = await cardService.getCardById(cardId);

    if (!card) {
      res.status(404).json({
        success: false,
        error: "Not Found",
        message: "Card not found",
      });
      return;
    }

    // Маскируем номер карты
    const responseCard = {
      ...card,
      card_number_masked: maskCardNumber(card.card_number),
      card_number: undefined,
      cvv_hash: undefined,
    };

    res.status(200).json({
      success: true,
      data: responseCard,
    });
  } catch (error) {
    logger.error("Get card by ID controller error:", error);

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to get card",
    });
  }
};

/**
 * Блокировка карты
 * POST /api/v1/cards/:cardId/block
 */
export const blockCard = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User not authenticated",
      });
      return;
    }

    const { cardId } = req.params;
    const { reason } = req.body;

    // Проверяем принадлежность карты
    const isOwner = await cardService.isCardOwner(cardId, req.user.userId);

    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have access to this card",
      });
      return;
    }

    await cardService.blockCard(cardId, reason);

    res.status(200).json({
      success: true,
      message: "Card blocked successfully",
    });
  } catch (error) {
    logger.error("Block card controller error:", error);

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to block card",
    });
  }
};

/**
 * Разблокировка карты
 * POST /api/v1/cards/:cardId/unblock
 */
export const unblockCard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User not authenticated",
      });
      return;
    }

    const { cardId } = req.params;

    // Проверяем принадлежность карты
    const isOwner = await cardService.isCardOwner(cardId, req.user.userId);

    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have access to this card",
      });
      return;
    }

    await cardService.unblockCard(cardId);

    res.status(200).json({
      success: true,
      message: "Card unblocked successfully",
    });
  } catch (error) {
    logger.error("Unblock card controller error:", error);

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to unblock card",
    });
  }
};

/**
 * Отметить карту как утерянную
 * POST /api/v1/cards/:cardId/report-lost
 */
export const reportCardLost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User not authenticated",
      });
      return;
    }

    const { cardId } = req.params;

    // Проверяем принадлежность карты
    const isOwner = await cardService.isCardOwner(cardId, req.user.userId);

    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have access to this card",
      });
      return;
    }

    await cardService.markCardAsLost(cardId);

    res.status(200).json({
      success: true,
      message: "Card reported as lost. Please order a new card.",
    });
  } catch (error) {
    logger.error("Report card lost controller error:", error);

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to report card as lost",
    });
  }
};

/**
 * Обновление лимитов карты
 * PATCH /api/v1/cards/:cardId/limits
 */
export const updateCardLimits = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User not authenticated",
      });
      return;
    }

    const { cardId } = req.params;
    const { daily_limit, monthly_limit } = req.body;

    // Проверяем принадлежность карты
    const isOwner = await cardService.isCardOwner(cardId, req.user.userId);

    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have access to this card",
      });
      return;
    }

    await cardService.updateCardLimits(cardId, daily_limit, monthly_limit);

    res.status(200).json({
      success: true,
      message: "Card limits updated successfully",
    });
  } catch (error) {
    logger.error("Update card limits controller error:", error);

    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: "Update Failed",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to update card limits",
    });
  }
};

/**
 * Включение/выключение бесконтактных платежей
 * PATCH /api/v1/cards/:cardId/contactless
 */
export const toggleContactless = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User not authenticated",
      });
      return;
    }

    const { cardId } = req.params;
    const { enabled } = req.body;

    // Проверяем принадлежность карты
    const isOwner = await cardService.isCardOwner(cardId, req.user.userId);

    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have access to this card",
      });
      return;
    }

    await cardService.toggleContactless(cardId, enabled);

    res.status(200).json({
      success: true,
      message: `Contactless payments ${enabled ? "enabled" : "disabled"} successfully`,
    });
  } catch (error) {
    logger.error("Toggle contactless controller error:", error);

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to toggle contactless payments",
    });
  }
};

/**
 * Включение/выключение онлайн платежей
 * PATCH /api/v1/cards/:cardId/online-payments
 */
export const toggleOnlinePayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User not authenticated",
      });
      return;
    }

    const { cardId } = req.params;
    const { enabled } = req.body;

    // Проверяем принадлежность карты
    const isOwner = await cardService.isCardOwner(cardId, req.user.userId);

    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have access to this card",
      });
      return;
    }

    await cardService.toggleOnlinePayments(cardId, enabled);

    res.status(200).json({
      success: true,
      message: `Online payments ${enabled ? "enabled" : "disabled"} successfully`,
    });
  } catch (error) {
    logger.error("Toggle online payments controller error:", error);

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to toggle online payments",
    });
  }
};

export default {
  createCard,
  getUserCards,
  getCardById,
  blockCard,
  unblockCard,
  reportCardLost,
  updateCardLimits,
  toggleContactless,
  toggleOnlinePayments,
};
