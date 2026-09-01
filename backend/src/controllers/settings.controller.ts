import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, getParam } from '../types';
import * as tagService from '../services/tags/tagService';
import * as analyticsService from '../services/analytics/analyticsService';
import { createTeamUser } from '../services/users/teamUserService';
import { saveWhatsAppAccount } from '../services/whatsapp/whatsappService';
import { WhatsAppAccount } from '../models/WhatsAppAccount';
import { env } from '../config/env';
import { getUserProfile } from '../services/users/userProfileService';

export async function listTags(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const tags = await tagService.listTags(req.user!);
    res.json(tags);
  } catch (error) {
    next(error);
  }
}

export async function createTag(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const tag = await tagService.createTag(req.user!, req.body.name);
    res.status(201).json(tag);
  } catch (error) {
    next(error);
  }
}

export async function updateTag(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const tag = await tagService.updateTag(req.user!, getParam(req.params.id), req.body.name);
    res.json(tag);
  } catch (error) {
    next(error);
  }
}

export async function deleteTag(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await tagService.deleteTag(req.user!, getParam(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getConversationAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getConversationAnalytics(req.user!);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getMessageAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getMessageAnalytics(req.user!);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getAgentAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getAgentAnalytics(req.user!);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getCallAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getCallAnalytics(req.user!);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTeamWorkload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getTeamWorkload(req.user!);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listTeamUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const users = await analyticsService.listTeamUsers(req.user!);
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function createTeamUserAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await createTeamUser(req.user!, req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function getAccountSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const account = await WhatsAppAccount.findOne({ tenantId: req.user!.tenantId });
    if (!account) {
      res.json({ configured: false });
      return;
    }
    res.json({
      configured: true,
      phoneNumberId: account.phoneNumberId,
      businessAccountId: account.businessAccountId,
      displayPhoneNumber: account.displayPhoneNumber,
      connectionStatus: account.connectionStatus,
      webhookConfigured: account.webhookConfigured,
      callingEnabled: env.CALLING_ENABLED,
    });
  } catch (error) {
    next(error);
  }
}

export async function getConnectionStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const account = await WhatsAppAccount.findOne({ tenantId: req.user!.tenantId });
    if (!account) {
      res.json({ configured: false });
      return;
    }
    res.json({
      configured: true,
      displayPhoneNumber: account.displayPhoneNumber,
      connectionStatus: account.connectionStatus,
      callingEnabled: env.CALLING_ENABLED,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAccountSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const account = await saveWhatsAppAccount(req.user!.tenantId, req.body);
    await tagService.seedDefaultTags(req.user!.tenantId, req.user!.userId);
    res.json({
      phoneNumberId: account.phoneNumberId,
      businessAccountId: account.businessAccountId,
      displayPhoneNumber: account.displayPhoneNumber,
      connectionStatus: account.connectionStatus,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWebhookInfo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    res.json({
      webhookUrl: `${req.protocol}://${req.get('host')}/api/whatsapp/webhook`,
      verifyToken: env.META_VERIFY_TOKEN,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await getUserProfile(req.user!);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}
