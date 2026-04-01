import { Component, signal } from '@angular/core';
import { KanbanBoardComponent } from './kanban-board/kanban-board.component';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [KanbanBoardComponent, ReactiveFormsModule],
  template: '<app-kanban-board></app-kanban-board>',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('todo-list');
}
