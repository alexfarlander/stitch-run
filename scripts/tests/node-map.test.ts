/**
 * Tests for Webhook Node Mapper
 * 
 * Validates that webhook sources correctly map to BMC node IDs
 */

import { describe, it, expect } from 'vitest';
import {
  WEBHOOK_NODE_MAP,
  mapWebhookSourceToNode,
  isValidWebhookSource,
  getValidWebhookSources,
} from '../node-map';

describe('Webhook Node Mapper', () => {
  describe('WEBHOOK_NODE_MAP', () => {
    it('should contain all required webhook sources', () => {
      const requiredSources = [
        'linkedin-lead',
        'youtube-signup',
        'seo-form',
        'calendly-demo',
        'stripe-trial',
        'stripe-subscription-basic',
        'stripe-subscription-pro',
        'stripe-subscription-enterprise',
        'zendesk-ticket',
        'stripe-churn',
        'referral',
      ];

      requiredSources.forEach(source => {
        expect(WEBHOOK_NODE_MAP).toHaveProperty(source);
      });
    });

    it('should map marketing sources to correct nodes', () => {
      expect(WEBHOOK_NODE_MAP['linkedin-lead']).toBe('item-linkedin-ads');
      expect(WEBHOOK_NODE_MAP['youtube-signup']).toBe('item-youtube-channel');
      expect(WEBHOOK_NODE_MAP['seo-form']).toBe('item-seo-content');
    });

    it('should map sales sources to correct nodes', () => {
      expect(WEBHOOK_NODE_MAP['calendly-demo']).toBe('item-demo-call');
    });

    it('should map offer sources to correct nodes', () => {
      expect(WEBHOOK_NODE_MAP['stripe-trial']).toBe('item-free-trial');
    });

    it('should map subscription sources to correct product nodes', () => {
      expect(WEBHOOK_NODE_MAP['stripe-subscription-basic']).toBe('item-basic-plan');
      expect(WEBHOOK_NODE_MAP['stripe-subscription-pro']).toBe('item-pro-plan');
      expect(WEBHOOK_NODE_MAP['stripe-subscription-enterprise']).toBe('item-enterprise');
    });

    it('should map support sources to correct nodes', () => {
      expect(WEBHOOK_NODE_MAP['zendesk-ticket']).toBe('item-help-desk');
    });

    it('should map churn sources to help desk', () => {
      expect(WEBHOOK_NODE_MAP['stripe-churn']).toBe('item-help-desk');
    });

    it('should map referral sources to correct nodes', () => {
      expect(WEBHOOK_NODE_MAP['referral']).toBe('item-referral-program');
    });
  });

  describe('mapWebhookSourceToNode', () => {
    it('should return correct node ID for valid sources', () => {
      expect(mapWebhookSourceToNode('linkedin-lead')).toBe('item-linkedin-ads');
      expect(mapWebhookSourceToNode('stripe-subscription-pro')).toBe('item-pro-plan');
      expect(mapWebhookSourceToNode('calendly-demo')).toBe('item-demo-call');
    });

    it('should return undefined for invalid sources', () => {
      expect(mapWebhookSourceToNode('invalid-source')).toBeUndefined();
      expect(mapWebhookSourceToNode('unknown-webhook')).toBeUndefined();
    });

    it('should handle empty string', () => {
      expect(mapWebhookSourceToNode('')).toBeUndefined();
    });
  });

  describe('isValidWebhookSource', () => {
    it('should return true for valid sources', () => {
      expect(isValidWebhookSource('linkedin-lead')).toBe(true);
      expect(isValidWebhookSource('stripe-subscription-basic')).toBe(true);
      expect(isValidWebhookSource('zendesk-ticket')).toBe(true);
    });

    it('should return false for invalid sources', () => {
      expect(isValidWebhookSource('invalid-source')).toBe(false);
      expect(isValidWebhookSource('unknown-webhook')).toBe(false);
      expect(isValidWebhookSource('')).toBe(false);
    });
  });

  describe('getValidWebhookSources', () => {
    it('should return all valid webhook sources', () => {
      const sources = getValidWebhookSources();
      
      expect(sources).toContain('linkedin-lead');
      expect(sources).toContain('youtube-signup');
      expect(sources).toContain('seo-form');
      expect(sources).toContain('calendly-demo');
      expect(sources).toContain('stripe-trial');
      expect(sources).toContain('stripe-subscription-basic');
      expect(sources).toContain('stripe-subscription-pro');
      expect(sources).toContain('stripe-subscription-enterprise');
      expect(sources).toContain('zendesk-ticket');
      expect(sources).toContain('stripe-churn');
      expect(sources).toContain('referral');
    });

    it('should return exactly 11 sources', () => {
      const sources = getValidWebhookSources();
      expect(sources).toHaveLength(11);
    });
  });
});
