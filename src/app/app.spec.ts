import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the Polish portfolio by default', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Buduję interfejsy');
    expect(compiled.querySelectorAll('.project-card')).toHaveLength(3);
  });

  it('should switch the portfolio to English', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const languageButtons = compiled.querySelectorAll<HTMLButtonElement>(
      '.language-switcher button',
    );

    languageButtons[1].click();
    fixture.detectChanges();

    expect(compiled.querySelector('h1')?.textContent).toContain('I build interfaces');
    expect(document.documentElement.lang).toBe('en');
  });
});
