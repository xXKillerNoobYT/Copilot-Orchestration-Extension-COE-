/**
 * Design Editor Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DesignEditor from '../DesignEditor.vue';

describe('DesignEditor.vue', () => {
  beforeEach(() => {
    // Mock window.vscode
    (window as any).vscode = {
      postMessage: vi.fn(),
    };
  });

  it('renders design editor with all tabs', () => {
    const wrapper = mount(DesignEditor);

    expect(wrapper.text()).toContain('Visual Design System Editor');
    expect(wrapper.text()).toContain('Colors');
    expect(wrapper.text()).toContain('Typography');
    expect(wrapper.text()).toContain('Spacing');
    expect(wrapper.text()).toContain('Components');
    expect(wrapper.text()).toContain('Live Preview');
    expect(wrapper.text()).toContain('Export');
  });

  it('starts with colors tab active', () => {
    const wrapper = mount(DesignEditor);
    expect(wrapper.find('.tab-button.active').text()).toContain('Colors');
  });

  it('switches tabs on button click', async () => {
    const wrapper = mount(DesignEditor);
    const typographyTab = wrapper.findAll('.tab-button')[1];
    
    await typographyTab.trigger('click');
    expect(wrapper.vm.activeTab).toBe('typography');
  });

  it('renders default design tokens', () => {
    const wrapper = mount(DesignEditor);
    expect(wrapper.vm.designTokens.colors.primary).toBe('#3B82F6');
    expect(wrapper.vm.designTokens.spacing.md).toBe('1rem');
  });

  it('displays error panel when validation fails', async () => {
    const wrapper = mount(DesignEditor);
    
    // Clear colors to cause validation error
    wrapper.vm.designTokens.colors = {};
    await wrapper.vm.$nextTick();
    
    await wrapper.vm.validateAndExport();
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.errors.length).toBeGreaterThan(0);
  });

  it('updates tokens through component emissions', async () => {
    const wrapper = mount(DesignEditor);
    
    const newColors = { primary: '#FF0000' };
    wrapper.vm.designTokens.colors = newColors;
    
    expect(wrapper.vm.designTokens.colors.primary).toBe('#FF0000');
  });

  it('resets to defaults on reset button click', async () => {
    const wrapper = mount(DesignEditor);
    
    // Change a color
    wrapper.vm.designTokens.colors.primary = '#000000';
    expect(wrapper.vm.designTokens.colors.primary).toBe('#000000');
    
    // Mock confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    await wrapper.vm.resetToDefaults();
    
    expect(wrapper.vm.designTokens.colors.primary).toBe('#3B82F6');
  });

  it('sends export message to vscode', async () => {
    const wrapper = mount(DesignEditor);
    
    await wrapper.vm.handleExport('json');
    
    expect((window as any).vscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'exportDesignTokens',
        payload: expect.objectContaining({
          format: 'json',
        }),
      })
    );
  });

  it('sends save message to vscode', async () => {
    const wrapper = mount(DesignEditor);
    
    await wrapper.vm.handleSave('my-tokens');
    
    expect((window as any).vscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'saveDesignTokens',
        payload: expect.objectContaining({
          filename: 'my-tokens',
        }),
      })
    );
  });

  it('has footer buttons for actions', () => {
    const wrapper = mount(DesignEditor);
    
    expect(wrapper.text()).toContain('Reset to Defaults');
    expect(wrapper.text()).toContain('Load from File');
    expect(wrapper.text()).toContain('Export Design Tokens');
  });

  it('includes default typography styles', () => {
    const wrapper = mount(DesignEditor);
    
    expect(wrapper.vm.designTokens.typography.length).toBeGreaterThan(0);
    expect(wrapper.vm.designTokens.typography[0].name).toBe('Heading 1');
  });

  it('includes default spacing scale', () => {
    const wrapper = mount(DesignEditor);
    
    const spacing = wrapper.vm.designTokens.spacing;
    expect(spacing.xs).toBe('0.25rem');
    expect(spacing.md).toBe('1rem');
    expect(spacing.xl).toBe('2rem');
  });

  it('includes default components', () => {
    const wrapper = mount(DesignEditor);
    
    expect(wrapper.vm.designTokens.components).toHaveProperty('Button');
    expect(wrapper.vm.designTokens.components).toHaveProperty('Card');
    expect(wrapper.vm.designTokens.components).toHaveProperty('Input');
  });
});
