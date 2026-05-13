import { Response } from 'express';

export const sendSuccess = (res: Response, data: any, message = 'Success', status = 200) => {
  res.status(status).json({ success: true, message, data });
};

export const sendError = (res: Response, message: string, status = 400, errors?: any) => {
  res.status(status).json({ success: false, message, ...(errors && { errors }) });
};

export const sendPaginated = (res: Response, data: any[], total: number, page: number, limit: number) => {
  res.json({
    success: true,
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};
