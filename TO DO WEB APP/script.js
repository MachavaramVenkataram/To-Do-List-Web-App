/**
 * ToDo Web Application
 * A feature-rich task management application built with Vanilla JavaScript
 */

class TodoApp {
    constructor() {
        // Initialize app state
        this.tasks = [];
        this.currentFilter = 'all';
        this.currentSearchTerm = '';
        this.taskIdCounter = 1;
        
        // DOM element references
        this.taskInput = document.getElementById('taskInput');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.taskList = document.getElementById('taskList');
        this.searchInput = document.getElementById('searchInput');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.themeToggle = document.getElementById('themeToggle');
        this.emptyState = document.getElementById('emptyState');
        this.totalTasks = document.getElementById('totalTasks');
        this.completedTasks = document.getElementById('completedTasks');
        this.pendingTasks = document.getElementById('pendingTasks');
        
        // Initialize the application
        this.init();
    }
    
    /**
     * Initialize the application
     */
    init() {
        this.loadTasksFromStorage();
        this.loadThemeFromStorage();
        this.bindEvents();
        this.renderTasks();
        this.updateStats();
        this.updateEmptyState();
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Task input events
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });
        
        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.currentSearchTerm = e.target.value.toLowerCase();
            this.renderTasks();
        });
        
        // Filter functionality
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Task list events (using event delegation)
        this.taskList.addEventListener('click', (e) => this.handleTaskListClick(e));
        this.taskList.addEventListener('keypress', (e) => this.handleTaskListKeypress(e));
        this.taskList.addEventListener('blur', (e) => this.handleTaskListBlur(e), true);
    }
    
    /**
     * Add a new task
     */
    addTask() {
        const text = this.taskInput.value.trim();
        
        if (!text) {
            this.showNotification('Please enter a task!', 'warning');
            return;
        }
        
        if (text.length > 200) {
            this.showNotification('Task is too long! Maximum 200 characters.', 'warning');
            return;
        }
        
        const task = {
            id: this.taskIdCounter++,
            text: text,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };
        
        this.tasks.unshift(task); // Add to beginning of array
        this.taskInput.value = '';
        this.saveTasksToStorage();
        this.renderTasks();
        this.updateStats();
        this.updateEmptyState();
        
        this.showNotification('Task added successfully!', 'success');
    }
    
    /**
     * Delete a task
     */
    deleteTask(taskId) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        
        if (taskElement) {
            taskElement.classList.add('removing');
            
            setTimeout(() => {
                this.tasks = this.tasks.filter(task => task.id !== taskId);
                this.saveTasksToStorage();
                this.renderTasks();
                this.updateStats();
                this.updateEmptyState();
                this.showNotification('Task deleted!', 'success');
            }, 300);
        }
    }
    
    /**
     * Toggle task completion status
     */
    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            
            this.saveTasksToStorage();
            this.renderTasks();
            this.updateStats();
            
            const status = task.completed ? 'completed' : 'marked as pending';
            this.showNotification(`Task ${status}!`, 'success');
        }
    }
    
    /**
     * Start editing a task
     */
    startEditTask(taskId) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        const contentElement = taskElement.querySelector('.task-content');
        const currentText = contentElement.textContent;
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'task-content editing';
        input.value = currentText;
        input.maxLength = 200;
        
        // Replace content with input
        contentElement.replaceWith(input);
        input.focus();
        input.select();
        
        // Store original text for cancellation
        input.dataset.originalText = currentText;
    }
    
    /**
     * Save edited task
     */
    saveEditTask(taskId, newText) {
        const trimmedText = newText.trim();
        
        if (!trimmedText) {
            this.showNotification('Task cannot be empty!', 'warning');
            this.cancelEditTask(taskId);
            return;
        }
        
        if (trimmedText.length > 200) {
            this.showNotification('Task is too long! Maximum 200 characters.', 'warning');
            this.cancelEditTask(taskId);
            return;
        }
        
        const task = this.tasks.find(t => t.id === taskId);
        
        if (task) {
            task.text = trimmedText;
            this.saveTasksToStorage();
            this.renderTasks();
            this.showNotification('Task updated!', 'success');
        }
    }
    
    /**
     * Cancel task editing
     */
    cancelEditTask(taskId) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        const inputElement = taskElement.querySelector('.task-content.editing');
        
        if (inputElement) {
            const originalText = inputElement.dataset.originalText;
            const contentElement = document.createElement('span');
            contentElement.className = 'task-content';
            contentElement.textContent = originalText;
            
            const task = this.tasks.find(t => t.id === taskId);
            if (task && task.completed) {
                contentElement.classList.add('completed');
            }
            
            inputElement.replaceWith(contentElement);
        }
    }
    
    /**
     * Set filter for tasks
     */
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        this.filterBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
        
        this.renderTasks();
    }
    
    /**
     * Get filtered tasks based on current filter and search term
     */
    getFilteredTasks() {
        let filteredTasks = [...this.tasks];
        
        // Apply completion filter
        if (this.currentFilter === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (this.currentFilter === 'pending') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        }
        
        // Apply search filter
        if (this.currentSearchTerm) {
            filteredTasks = filteredTasks.filter(task =>
                task.text.toLowerCase().includes(this.currentSearchTerm)
            );
        }
        
        return filteredTasks;
    }
    
    /**
     * Render tasks in the DOM
     */
    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        
        this.taskList.innerHTML = '';
        
        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            this.taskList.appendChild(taskElement);
        });
        
        this.updateEmptyState();
    }
    
    /**
     * Create a task DOM element
     */
    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.taskId = task.id;
        
        li.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle"></div>
            <span class="task-content ${task.completed ? 'completed' : ''}">${this.escapeHtml(task.text)}</span>
            <div class="task-actions">
                <button class="action-btn edit-btn" data-action="edit" title="Edit task">✏️</button>
                <button class="action-btn delete-btn" data-action="delete" title="Delete task">🗑️</button>
            </div>
        `;
        
        return li;
    }
    
    /**
     * Handle clicks on task list
     */
    handleTaskListClick(e) {
        const taskElement = e.target.closest('.task-item');
        if (!taskElement) return;
        
        const taskId = parseInt(taskElement.dataset.taskId);
        const action = e.target.dataset.action;
        
        switch (action) {
            case 'toggle':
                this.toggleTask(taskId);
                break;
            case 'edit':
                this.startEditTask(taskId);
                break;
            case 'delete':
                if (confirm('Are you sure you want to delete this task?')) {
                    this.deleteTask(taskId);
                }
                break;
        }
    }
    
    /**
     * Handle keypress events on task list
     */
    handleTaskListKeypress(e) {
        if (e.target.classList.contains('editing') && e.key === 'Enter') {
            const taskElement = e.target.closest('.task-item');
            const taskId = parseInt(taskElement.dataset.taskId);
            this.saveEditTask(taskId, e.target.value);
        } else if (e.target.classList.contains('editing') && e.key === 'Escape') {
            const taskElement = e.target.closest('.task-item');
            const taskId = parseInt(taskElement.dataset.taskId);
            this.cancelEditTask(taskId);
        }
    }
    
    /**
     * Handle blur events on task list
     */
    handleTaskListBlur(e) {
        if (e.target.classList.contains('editing')) {
            const taskElement = e.target.closest('.task-item');
            const taskId = parseInt(taskElement.dataset.taskId);
            this.saveEditTask(taskId, e.target.value);
        }
    }
    
    /**
     * Update task statistics
     */
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;
        
        this.totalTasks.textContent = total;
        this.completedTasks.textContent = completed;
        this.pendingTasks.textContent = pending;
    }
    
    /**
     * Update empty state visibility
     */
    updateEmptyState() {
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            this.emptyState.classList.add('show');
            
            // Update empty state message based on current state
            const emptyIcon = this.emptyState.querySelector('.empty-icon');
            const emptyTitle = this.emptyState.querySelector('h3');
            const emptyText = this.emptyState.querySelector('p');
            
            if (this.currentSearchTerm) {
                emptyIcon.textContent = '🔍';
                emptyTitle.textContent = 'No matching tasks';
                emptyText.textContent = 'Try adjusting your search terms.';
            } else if (this.currentFilter === 'completed') {
                emptyIcon.textContent = '✅';
                emptyTitle.textContent = 'No completed tasks';
                emptyText.textContent = 'Complete some tasks to see them here.';
            } else if (this.currentFilter === 'pending') {
                emptyIcon.textContent = '⏳';
                emptyTitle.textContent = 'No pending tasks';
                emptyText.textContent = 'Great job! All tasks are completed.';
            } else {
                emptyIcon.textContent = '📝';
                emptyTitle.textContent = 'No tasks yet';
                emptyText.textContent = 'Add your first task to get started!';
            }
        } else {
            this.emptyState.classList.remove('show');
        }
    }
    
    /**
     * Toggle between light and dark theme
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Update theme toggle icon
        const themeIcon = this.themeToggle.querySelector('.theme-icon');
        themeIcon.textContent = newTheme === 'light' ? '🌙' : '☀️';
        
        // Save theme preference
        localStorage.setItem('todoApp_theme', newTheme);
        
        this.showNotification(`Switched to ${newTheme} mode`, 'success');
    }
    
    /**
     * Load theme from localStorage
     */
    loadThemeFromStorage() {
        const savedTheme = localStorage.getItem('todoApp_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Update theme toggle icon
        const themeIcon = this.themeToggle.querySelector('.theme-icon');
        themeIcon.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    }
    
    /**
     * Save tasks to localStorage
     */
    saveTasksToStorage() {
        try {
            localStorage.setItem('todoApp_tasks', JSON.stringify(this.tasks));
            localStorage.setItem('todoApp_taskIdCounter', this.taskIdCounter.toString());
        } catch (error) {
            console.error('Failed to save tasks to localStorage:', error);
            this.showNotification('Failed to save tasks!', 'error');
        }
    }
    
    /**
     * Load tasks from localStorage
     */
    loadTasksFromStorage() {
        try {
            const savedTasks = localStorage.getItem('todoApp_tasks');
            const savedCounter = localStorage.getItem('todoApp_taskIdCounter');
            
            if (savedTasks) {
                this.tasks = JSON.parse(savedTasks);
            }
            
            if (savedCounter) {
                this.taskIdCounter = parseInt(savedCounter);
            }
        } catch (error) {
            console.error('Failed to load tasks from localStorage:', error);
            this.showNotification('Failed to load saved tasks!', 'error');
            this.tasks = [];
            this.taskIdCounter = 1;
        }
    }
    
    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add notification styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#27ae60';
                break;
            case 'warning':
                notification.style.backgroundColor = '#f39c12';
                break;
            case 'error':
                notification.style.backgroundColor = '#e74c3c';
                break;
            default:
                notification.style.backgroundColor = '#4a90e2';
        }
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Add CSS animations for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(notificationStyles);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to add task
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        document.getElementById('addTaskBtn').click();
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
        const searchInput = document.getElementById('searchInput');
        if (searchInput.value) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }
    }
});