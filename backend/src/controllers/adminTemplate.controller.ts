import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, getParam } from '../types';
import { deleteAdminTemplateSchema } from '../validators/template.admin.validator';
import * as adminTemplateService from '../services/messages/adminTemplateService';

export async function listTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminTemplateService.listAdminTemplates(req.user!);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const template = await adminTemplateService.createAdminTemplate(req.user!, req.body);
    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
}

export async function updateTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const template = await adminTemplateService.updateAdminTemplate(
      req.user!,
      getParam(req.params.id),
      req.body
    );
    res.json(template);
  } catch (error) {
    next(error);
  }
}

export async function deleteTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = deleteAdminTemplateSchema.safeParse({
      name: req.query.name,
      language: req.query.language,
    });
    if (!parsed.success) {
      res.status(400).json({ error: 'Query parameters name and language are required' });
      return;
    }
    await adminTemplateService.deleteAdminTemplate(req.user!, {
      name: parsed.data.name,
      language: parsed.data.language,
      templateId: getParam(req.params.id),
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
