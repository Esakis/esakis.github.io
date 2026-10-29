import { Pipe, PipeTransform } from '@angular/core';

/**
 * Dzieli tekst na słowa — do kinetycznej typografii nagłówków (każde słowo
 * wjeżdża osobno). Podział w szablonie, a nie w DOM, więc Angular dalej
 * zarządza tekstem i przełączanie języka działa normalnie.
 */
@Pipe({ name: 'words' })
export class WordsPipe implements PipeTransform {
  transform(value: string): string[] {
    return value.trim().split(/\s+/).filter(Boolean);
  }
}
