import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersService } from './users/users.service.js';
import { MailService } from './mail/mail.service.js';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let mailService: jest.Mocked<Partial<MailService>>;

  beforeEach(() => {
    appService = new AppService();
    usersService = {
      findAllErrands: jest.fn<any>().mockResolvedValue({ data: [], meta: { total: 0 } }),
    };
    mailService = {
      sendContactEmail: jest.fn<any>().mockResolvedValue(true),
    };

    appController = new AppController(
      appService,
      usersService as unknown as UsersService,
      mailService as unknown as MailService,
    );
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('getErrandProfiles', () => {
    it('should delegate to usersService.findAllErrands', async () => {
      const query = { page: 1, limit: 10 };
      const result = await appController.getErrandProfiles(query);
      expect(usersService.findAllErrands).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });
  });

  describe('submitContactForm', () => {
    it('should send contact email and return success message', async () => {
      const body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        subject: 'Inquiry',
        message: 'Hello ErrandHub',
      };
      const result = await appController.submitContactForm(body);
      expect(mailService.sendContactEmail).toHaveBeenCalledWith(
        'John',
        'Doe',
        'john@example.com',
        'Inquiry',
        'Hello ErrandHub',
      );
      expect(result).toEqual({ success: true, message: 'Message sent successfully' });
    });
  });

  describe('debugSentry', () => {
    it('should throw an error for sentry debugging', () => {
      expect(() => appController.debugSentry()).toThrow('My first Sentry error!');
    });
  });
});
