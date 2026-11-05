import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AppError, getParam } from '../types';
import * as messageService from '../services/messages/messageService';
import * as templateService from '../services/messages/templateService';

export async function listMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const result = await messageService.listMessages(req.user!, getParam(req.params.id), page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.createMessage(req.user!, req.conversation!, req.body);
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}

export async function createMediaMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      next(new AppError(400, 'No file uploaded'));
      return;
    }

    const voiceNote = req.body.voiceNote === true || req.body.voiceNote === 'true';

    // Verify the audio signature before declaring a voice note as MP3.
    if (voiceNote) {
      const b = file.buffer;
      const hasId3Header =
        b.length >= 3 && b.subarray(0, 3).toString('ascii') === 'ID3';
      const hasMpegFrameHeader =
        b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0;

      if (!hasId3Header && !hasMpegFrameHeader) {
        throw new AppError(
          400,
          'Voice note is not a valid MP3 file. Please record again and retry.'
        );
      }
    }

    const { mimeToMessageType } = await import('../utils/mediaType');
    const voiceMimeType = voiceNote ? 'audio/mpeg' : file.mimetype;
    const message = await messageService.createMessage(req.user!, req.conversation!, {
      type: voiceNote ? 'VOICE' : mimeToMessageType(file.mimetype),
      content: voiceNote ? { voice: true } : { caption: req.body.caption ?? '' },
      replyToMessageId: req.body.replyToMessageId,
      mediaBuffer: file.buffer,
      mimeType: voiceMimeType,
      fileName: voiceNote ? 'voice-note.mp3' : file.originalname,
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}

export async function addReaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.getMessageById(req.user!, getParam(req.params.id));
    const reaction = await messageService.addReaction(req.user!, message, req.body.emoji);
    res.json(reaction);
  } catch (error) {
    next(error);
  }
}

export async function togglePin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.getMessageById(req.user!, getParam(req.params.id));
    const result = await messageService.togglePin(req.user!, message);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function toggleStar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.getMessageById(req.user!, getParam(req.params.id));
    const result = await messageService.toggleStar(req.user!, message);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function editMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.getMessageById(req.user!, getParam(req.params.id));
    const result = await messageService.editMessage(req.user!, message, req.body.text, {
      sendCorrectionToWhatsApp: req.body.sendCorrectionToWhatsApp,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function retryMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.getMessageById(req.user!, getParam(req.params.id));
    const result = await messageService.retryMessage(req.user!, message);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.getMessageById(req.user!, getParam(req.params.id));
    const result = await messageService.deleteMessage(req.user!, message, req.body.scope);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function downloadMedia(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const media = await messageService.downloadMessageMedia(req.user!, getParam(req.params.id));
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${media.fileName.replace(/"/g, '')}"`);
    res.send(media.body);
  } catch (error) {
    next(error);
  }
}

export async function getPinned(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const messages = await messageService.getPinnedMessages(req.user!, getParam(req.params.id));
    res.json(messages);
  } catch (error) {
    next(error);
  }
}

export async function getStarred(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const messages = await messageService.getStarredMessages(req.user!, getParam(req.params.id));
    res.json(messages);
  } catch (error) {
    next(error);
  }
}

export async function getApprovedTemplates(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const templates = await templateService.getApprovedTemplates(
      req.user!,
      req.conversation!
    );
    res.json({ data: templates });
  } catch (error) {
    next(error);
  }
}

export async function sendApprovedTemplate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const message = await templateService.sendApprovedTemplate(
      req.user!,
      req.conversation!,
      {
        templateName: req.body.templateName,
        languageCode: req.body.languageCode,
        components: req.body.components,
      }
    );
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}
