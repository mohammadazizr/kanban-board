import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  columnId: string;
  attachments?: {
    name: string;
    type: string;
    url: string;
  }[];
  comments?: {
    id: string;
    text: string;
    timestamp: Date;
  }[];
}

export interface KanbanColumn {
  id: string;
  title: string;
  cardIds: string[];
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  template: `
    <div class="kanban-board">
      <div class="columns-container">
        @for (column of columns(); track column.id) {
          <div class="column" [attr.data-column-id]="column.id">
            <div class="column-header">
              <h3>{{ column.title }}</h3>
              <span class="card-count">{{ column.cardIds.length }}</span>
            </div>
            <div class="cards-container" (dragover)="onDragOver($event)" (drop)="onDrop($event, column.id)">
              @for (card of getCardsForColumn(column.id); track card.id) {
                <div class="card" draggable="true" (dragstart)="onDragStart($event, card.id)" [attr.data-card-id]="card.id" [attr.data-column-id]="card.columnId" (click)="openComments(card)">
                  <div class="card-header">
                    <h4>{{ card.title }}</h4>
                  </div>
                  <p>{{ card.description }}</p>
                  @if (card.attachments && card.attachments.length > 0) {
                    <div class="attachments-list">
                      @for (attachment of card.attachments; track attachment.name) {
                        <div class="attachment-item">
                          <span class="attachment-icon">{{ getAttachmentIcon(attachment.type) }}</span>
                          <span class="attachment-name">{{ attachment.name }}</span>
                        </div>
                      }
                    </div>
                  }
                  @if (card.comments && card.comments.length > 0) {
                    <div class="card-comments">
                      @for (comment of card.comments; track comment.id) {
                        <div class="comment-item">
                          {{ comment.text }}
                        </div>
                      }
                    </div>
                  }
                  <div class="comment-form">
                    <input type="text" class="comment-input" [(ngModel)]="commentText" placeholder="Add a comment...">
                    <button class="comment-submit" (click)="addComment(card.id)">Post</button>
                  </div>
                  <div class="card-actions">
                    <button class="edit-btn" (click)="editCard(card)">Edit</button>
                    <button class="delete-btn" (click)="deleteCard(card.id)">Delete</button>
                  </div>
                </div>
              }
              <div class="add-card" (click)="openAddCardForm(column.id)">
                <div class="add-card-button">+ Add a card</div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Add/Edit Card Modal -->
      @if (isModalOpen()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <h3>{{ isEditing() ? 'Edit Card' : 'Add New Card' }}</h3>
            <form [formGroup]="cardForm" (submit)="saveCard()">
              <div class="form-group">
                <label for="cardTitle">Title</label>
                <input id="cardTitle" type="text" formControlName="title" placeholder="Enter card title">
              </div>
              <div class="form-group">
                <label for="cardDescription">Description</label>
                <textarea id="cardDescription" formControlName="description" placeholder="Enter card description"></textarea>
              </div>
              <div class="form-group">
                <label for="cardAttachments">Attachments</label>
                <input type="file" id="cardAttachments" multiple (change)="onFileSelected($event)" accept="image/*,.pdf">
                <div class="selected-files" *ngIf="selectedFiles.length > 0">
                  @for (file of selectedFiles; track file.name) {
                    <div class="file-item">
                      <span class="file-icon">{{ getFileIcon(file) }}</span>
                      <span class="file-name">{{ file.name }}</span>
                    </div>
                  }
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="cancel-btn" (click)="closeModal()">Cancel</button>
                <button type="submit" class="save-btn">Save Card</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      --primary-color: #4361ee;
      --secondary-color: #3a0ca3;
      --accent-color: #4cc9f0;
      --success-color: #4caf50;
      --danger-color: #f44336;
      --warning-color: #ff9800;
      --light-color: #f8f9fa;
      --dark-color: #212529;
      --gray-color: #6c757d;
      --border-radius: 8px;
      --box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      --transition: all 0.3s ease;
    }

    .kanban-board {
      padding: 20px;
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .columns-container {
      display: flex;
      gap: 20px;
      padding: 10px 0;
      overflow-x: auto;
      margin-bottom: 20px;
    }

    .column {
      flex: 1;
      min-width: 280px;
      background: linear-gradient(145deg, #ffffff, #f0f4f8);
      border-radius: var(--border-radius);
      padding: 15px;
      box-shadow: var(--box-shadow);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .column[data-column-id="todo"] {
      border-left: 4px solid #4361ee; /* Biru untuk To Do */
    }

    .column[data-column-id="progress"] {
      border-left: 4px solid #f72585; /* Merah muda untuk In Progress */
    }

    .column[data-column-id="done"] {
      border-left: 4px solid #4caf50; /* Hijau untuk Done */
    }

    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid var(--accent-color);
    }

    .column-header h3 {
      margin: 0;
      font-size: 1.2em;
      font-weight: 700;
      color: var(--secondary-color);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-count {
      background: var(--primary-color);
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9em;
      font-weight: 600;
      color: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .cards-container {
      min-height: 200px;
    }

    .card {
      background: white;
      border-radius: var(--border-radius);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      padding: 15px;
      margin-bottom: 12px;
      cursor: grab;
      transition: var(--transition);
      border: 1px solid rgba(0, 0, 0, 0.05);
      position: relative;
      overflow: hidden;
    }

    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: var(--primary-color);
    }

    .card[data-column-id="todo"]::before {
      background: #4361ee; /* Biru untuk To Do */
    }

    .card[data-column-id="progress"]::before {
      background: #f72585; /* Merah muda untuk In Progress */
    }

    .card[data-column-id="done"]::before {
      background: #4caf50; /* Hijau untuk Done */
    }

    .card-comments {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #eee;
    }

    .comment-item {
      background: rgba(67, 97, 238, 0.05);
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 6px;
      font-size: 0.85em;
    }

    .comment-form {
      margin-top: 10px;
      display: flex;
      gap: 8px;
    }

    .comment-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.85em;
    }

    .comment-submit {
      padding: 8px 16px;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85em;
    }

    .comment-submit:hover {
      background: var(--secondary-color);
    }

    .card:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }

    .card-header {
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px dashed rgba(0, 0, 0, 0.05);
    }

    .card-header h4 {
      margin: 0;
      font-size: 1.05em;
      font-weight: 600;
      color: var(--dark-color);
      line-height: 1.3;
    }

    .card p {
      margin: 8px 0;
      font-size: 0.95em;
      color: var(--gray-color);
      line-height: 1.5;
    }

    .attachments-list {
      margin: 12px 0;
    }

    .attachment-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      background: rgba(76, 201, 240, 0.15);
      border-radius: 4px;
      font-size: 0.85em;
      margin-bottom: 4px;
    }

    .attachment-icon {
      padding: 2px 6px;
      background: var(--accent-color);
      color: white;
      border-radius: 3px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      font-size: 0.75em;
    }

    .card-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      justify-content: flex-end;
    }

    .edit-btn, .delete-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      background: var(--primary-color);
      color: white;
      font-size: 0.85em;
      cursor: pointer;
      transition: var(--transition);
      font-weight: 500;
    }

    .edit-btn:hover {
      background: var(--secondary-color);
    }

    .delete-btn {
      background: var(--danger-color);
    }

    .delete-btn:hover {
      background: #d32f2f;
    }

    .add-card {
      cursor: pointer;
      padding: 12px;
      border-radius: var(--border-radius);
      background: rgba(67, 97, 238, 0.08);
      text-align: center;
      font-size: 0.95em;
      color: var(--primary-color);
      transition: var(--transition);
      border: 2px dashed rgba(67, 97, 238, 0.3);
    }

    .add-card:hover {
      background: rgba(67, 97, 238, 0.15);
      border-color: var(--primary-color);
    }

    .add-card-button {
      color: var(--primary-color);
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(2px);
    }

    .modal-content {
      background: white;
      border-radius: var(--border-radius);
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-content h3 {
      margin: 0 0 20px 0;
      padding: 20px;
      border-bottom: 1px solid #eee;
      color: var(--dark-color);
      font-size: 1.4em;
      font-weight: 600;
      background: linear-gradient(to right, var(--primary-color), var(--secondary-color));
      color: white;
      border-radius: var(--border-radius) var(--border-radius) 0 0;
    }

    .form-group {
      padding: 0 20px 15px 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: var(--dark-color);
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: var(--border-radius);
      font-size: 1em;
      box-sizing: border-box;
      transition: var(--transition);
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.2);
    }

    .form-group textarea {
      min-height: 100px;
      resize: vertical;
    }

    .selected-files {
      margin-top: 10px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.03);
      border-radius: var(--border-radius);
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: rgba(76, 201, 240, 0.15);
      border-radius: 4px;
      font-size: 0.9em;
      margin-bottom: 6px;
      transition: var(--transition);
    }

    .file-item:hover {
      background: rgba(76, 201, 240, 0.25);
      transform: translateX(3px);
    }

    .file-icon {
      padding: 4px 8px;
      background: var(--accent-color);
      color: white;
      border-radius: 4px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      font-size: 0.8em;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 15px 20px;
      border-top: 1px solid #eee;
    }

    .cancel-btn,
    .save-btn {
      padding: 10px 20px;
      border: none;
      border-radius: var(--border-radius);
      cursor: pointer;
      font-size: 1em;
      font-weight: 600;
      transition: var(--transition);
    }

    .cancel-btn {
      background: #f5f5f5;
      color: var(--dark-color);
      border: 1px solid #ddd;
    }

    .cancel-btn:hover {
      background: #e0e0e0;
    }

    .save-btn {
      background: var(--primary-color);
      color: white;
    }

    .save-btn:hover {
      background: var(--secondary-color);
      transform: translateY(-2px);
    }

    [dragover] {
      background-color: rgba(76, 201, 240, 0.2);
      border: 1px dashed var(--accent-color);
    }

    @media (max-width: 768px) {
      .columns-container {
        flex-direction: column;
      }
      
      .column {
        min-width: 100%;
      }
      
      .kanban-board {
        padding: 10px;
      }
    }
  `
})
export class KanbanBoardComponent {
  // Constructor for FormBuilder  
  private fb = new FormBuilder();

  // Column configurations with initial cards
  columns = signal<KanbanColumn[]>([
    {
      id: 'todo',
      title: 'To Do',
      cardIds: ['1', '2']
    },
    {
      id: 'progress',
      title: 'In Progress',
      cardIds: ['3']
    },
    {
      id: 'done',
      title: 'Done',
      cardIds: []
    }
  ]);

  // Card data storage
  cards = signal<KanbanCard[]>([
    {
      id: '1',
      title: 'Implement Kanban Board',
      description: 'Create the initial structure with columns and basic cards',
      columnId: 'todo',
      comments: []
    },
    {
      id: '2',
      title: 'Add Drag & Drop',
      description: 'Implement drag and drop functionality between columns',
      columnId: 'todo',
      comments: []
    },
    {
      id: '3',
      title: 'Style the Interface',
      description: 'Apply responsive design and improve visual aesthetics',
      columnId: 'progress',
      comments: []
    }
  ]);

  // Modal state
  isModalOpen = signal(false);
  isEditing = signal(false);
  currentCardId = signal<string | null>(null);
  currentColumnId = signal<string | null>(null);
  currentCardComments = signal<{id: string, text: string, timestamp: Date}[] | null>(null);

  // File handling
  selectedFiles: File[] = [];

  // Form
  cardForm = this.fb.group({
    title: [''],
    description: ['']
  });

  // Comment form
  commentText = '';

  getCardsForColumn(columnId: string): KanbanCard[] {
    const column = this.columns().find(c => c.id === columnId);
    if (!column) return [];
    
    return this.cards()
      .filter(card => card.columnId === columnId)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  openAddCardForm(columnId: string) {
    this.isEditing.set(false);
    this.currentColumnId.set(columnId);
    this.cardForm.reset();
    this.selectedFiles = [];
    this.isModalOpen.set(true);
  }

  editCard(card: KanbanCard) {
    this.isEditing.set(true);
    this.currentCardId.set(card.id);
    this.cardForm.patchValue({
      title: card.title,
      description: card.description
    });
    this.selectedFiles = [];
    this.isModalOpen.set(true);
  }

  openComments(card: KanbanCard) {
    // Untuk demo, kita hanya akan menampilkan komentar dalam console
    console.log('Opening comments for card:', card.id);
    // Dalam implementasi nyata, Anda akan menunjukkan modal untuk komentar
  }

  addComment(cardId: string) {
    if (this.commentText.trim() === '') return;

    const updatedCards = this.cards().map(card => {
      if (card.id === cardId) {
        const newComment = {
          id: Date.now().toString(),
          text: this.commentText,
          timestamp: new Date()
        };
        return {
          ...card,
          comments: [...(card.comments || []), newComment]
        };
      }
      return card;
    });

    this.cards.set(updatedCards);
    this.commentText = '';
  }

  saveCard() {
    if (this.cardForm.invalid) return;

    const { title, description } = this.cardForm.value;

    if (this.isEditing()) {
      // Update existing card
      const updatedCards = this.cards().map(card => 
        card.id === this.currentCardId() 
          ? { 
              ...card, 
              title: title || '', 
              description: description || '',
              attachments: card.attachments || []
            } 
          : card
      );
      this.cards.set(updatedCards);
    } else if (this.currentColumnId()) {
      // Add new card
      const newCard: KanbanCard = {
        id: Date.now().toString(),
        title: title || '',
        description: description || '',
        columnId: this.currentColumnId()!,
        attachments: []
      };

      // Add to cards array
      const updatedCards = [...this.cards(), newCard];
      this.cards.set(updatedCards);

      // Add to column
      const updatedColumns = this.columns().map(col => 
        col.id === this.currentColumnId() 
          ? { ...col, cardIds: [...col.cardIds, newCard.id] } 
          : col
      );
      this.columns.set(updatedColumns);
    }

    this.closeModal();
  }

  deleteCard(cardId: string) {
    // Remove card from cards array
    const updatedCards = this.cards().filter(card => card.id !== cardId);
    this.cards.set(updatedCards);

    // Remove card from column
    const updatedColumns = this.columns().map(col => ({
      ...col,
      cardIds: col.cardIds.filter(id => id !== cardId)
    }));
    this.columns.set(updatedColumns);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.isEditing.set(false);
    this.currentCardId.set(null);
    this.currentColumnId.set(null);
    this.cardForm.reset();
    this.selectedFiles = [];
  }

  // File handling methods
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  getAttachmentIcon(type: string): string {
    if (type.startsWith('image/')) {
      return '🖼️';
    } else if (type === 'application/pdf') {
      return '📄';
    }
    return '📎';
  }

  getFileIcon(file: File): string {
    if (file.type.startsWith('image/')) {
      return '🖼️';
    } else if (file.type === 'application/pdf') {
      return '📄';
    }
    return '📎';
  }

  // Drag and drop methods
  onDragStart(event: DragEvent, cardId: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('cardId', cardId);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent, columnId: string) {
    event.preventDefault();
    const cardId = event.dataTransfer?.getData('cardId');
    
    if (cardId && columnId) {
      // Find current column of the card
      const currentCard = this.cards().find(card => card.id === cardId);
      
      if (currentCard && currentCard.columnId !== columnId) {
        // Move card to new column
        const updatedCards = this.cards().map(card => 
          card.id === cardId ? { ...card, columnId } : card
        );
        
        this.cards.set(updatedCards);
        
        // Update column associations
        const updatedColumns = this.columns().map(col => {
          const newCardIds = col.cardIds.filter(id => id !== cardId);
          if (col.id === columnId) {
            newCardIds.push(cardId);
          }
          return { ...col, cardIds: newCardIds };
        });
        
        this.columns.set(updatedColumns);
      }
    }
  }
}