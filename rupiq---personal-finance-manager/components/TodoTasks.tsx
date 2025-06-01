
import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { TodoTask } from '../types';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { PlusCircleIcon, TrashIcon, CheckBadgeIcon } from './icons/IconComponents';

const TodoTasks: React.FC = () => {
  const [tasks, setTasks] = useLocalStorage<TodoTask[]>('todoTasks', []);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: TodoTask = {
      id: Date.now().toString(),
      text: newTaskText,
      isCompleted: false,
      dueDate: newTaskDueDate || undefined,
    };
    setTasks([...tasks, newTask]);
    setNewTaskText('');
    setNewTaskDueDate('');
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks(tasks.map(task => task.id === id ? { ...task, isCompleted: !task.isCompleted } : task));
  };

  const deleteTask = (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter(task => task.id !== id));
    }
  };
  
  const pendingTasks = tasks.filter(task => !task.isCompleted).sort((a,b) => (a.dueDate && b.dueDate) ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() : (a.dueDate ? -1 : (b.dueDate ? 1: 0)));
  const completedTasks = tasks.filter(task => task.isCompleted).sort((a,b) => (a.dueDate && b.dueDate) ? new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime() : 0);


  return (
    <div className="space-y-6">
      <Card title="Add New To-Do Task">
        <form onSubmit={handleAddTask} className="space-y-4 md:space-y-0 md:flex md:space-x-3 md:items-end">
          <Input
            containerClassName="flex-grow mb-0"
            label="Task Description"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="What needs to be done?"
            required
          />
          <Input
            containerClassName="md:w-48 mb-0"
            label="Due Date (Optional)"
            type="date"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
          <Button type="submit" leftIcon={<PlusCircleIcon />} className="w-full md:w-auto">Add Task</Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={`Pending Tasks (${pendingTasks.length})`}>
          {pendingTasks.length === 0 ? (
            <p className="text-content-secondary text-center py-4">No pending tasks. Well done!</p>
          ) : (
            <ul className="space-y-3">
              {pendingTasks.map(task => (
                <li key={task.id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => toggleTaskCompletion(task.id)}
                      className="h-5 w-5 text-primary border-base-300 rounded focus:ring-primary mr-3 cursor-pointer"
                    />
                    <div>
                        <span className={`${task.isCompleted ? 'line-through text-neutral' : 'text-content'}`}>{task.text}</span>
                        {task.dueDate && <p className="text-xs text-neutral">Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-700" aria-label="Delete task">
                    <TrashIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Completed Tasks (${completedTasks.length})`}>
          {completedTasks.length === 0 ? (
            <p className="text-content-secondary text-center py-4">No tasks completed yet.</p>
          ) : (
            <ul className="space-y-3">
              {completedTasks.map(task => (
                <li key={task.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg shadow">
                  <div className="flex items-center">
                    <CheckBadgeIcon className="w-5 h-5 text-green-600 mr-3"/>
                     <div>
                        <span className="line-through text-neutral">{task.text}</span>
                        {task.dueDate && <p className="text-xs text-neutral">Completed by: {new Date(task.dueDate).toLocaleDateString()}</p>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-700" aria-label="Delete task">
                    <TrashIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TodoTasks;
