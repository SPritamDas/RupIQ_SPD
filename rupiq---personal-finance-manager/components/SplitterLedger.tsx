
import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { SplitEvent, SplitEventParticipant } from '../types';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Modal } from './common/Modal';
import { PlusCircleIcon, TrashIcon, PencilIcon, CheckBadgeIcon } from './icons/IconComponents';
import { formatCurrency } from '../services/financeService';
import { DEFAULT_CURRENCY } from '../constants';

interface FriendBalance {
  name: string;
  balance: number; // Positive if you owe them, negative if they owe you
}

const SplitterLedger: React.FC = () => {
  const [splitEvents, setSplitEvents] = useLocalStorage<SplitEvent[]>('splitEvents', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SplitEvent | null>(null);
  
  // State for Settle Up Modal
  const [isSettleModalOpen, setIsSettleModalOpen] = useState<boolean>(false);
  const [settlingFriend, setSettlingFriend] = useState<FriendBalance | null>(null);


  const initialFormState = {
    description: '',
    date: new Date().toISOString().split('T')[0],
    totalAmount: '',
    paidBy: '', 
    participants: [{ name: 'Me', share: 0, paid: 0 }] as SplitEventParticipant[],
  };
  const [formState, setFormState] = useState(initialFormState);

  const openModalForNew = () => {
    setEditingEvent(null);
    setFormState({ 
        ...initialFormState, 
        participants: [
            { name: 'Me', share: 0, paid: 0 },
            { name: '', share: 0, paid: 0 } // Start with one friend field
        ]
    });
    setIsModalOpen(true);
  };

  const openModalForEdit = (event: SplitEvent) => {
    setEditingEvent(event);
    setFormState({
      description: event.description,
      date: event.date,
      totalAmount: event.totalAmount.toString(),
      paidBy: event.paidBy, // This is mostly informational for non-synced events
      participants: JSON.parse(JSON.stringify(event.participants)), // Deep copy
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleParticipantChange = (index: number, field: keyof SplitEventParticipant, value: string) => {
    const newParticipants = [...formState.participants];
    if (field === 'name') {
      newParticipants[index].name = value;
    } else {
      (newParticipants[index] as any)[field] = parseFloat(value) || 0;
    }
    setFormState(prev => ({ ...prev, participants: newParticipants }));
  };

  const addParticipant = () => {
    setFormState(prev => ({
      ...prev,
      participants: [...prev.participants, { name: '', share: 0, paid: 0 }],
    }));
  };
  
  const removeParticipant = (index: number) => {
    setFormState(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index),
    }));
  };

  const distributeSharesEqually = () => {
    const total = parseFloat(formState.totalAmount) || 0;
    if (formState.participants.length === 0 || total <= 0) return;
    const sharePerPerson = total / formState.participants.length;
    const updatedParticipants = formState.participants.map(p => ({ ...p, share: parseFloat(sharePerPerson.toFixed(2)) }));
    
    const sumOfShares = updatedParticipants.reduce((sum, p) => sum + p.share, 0);
    if (updatedParticipants.length > 0 && Math.abs(sumOfShares - total) > 0.001) { // Adjust last person for rounding
        const diff = total - sumOfShares;
        updatedParticipants[updatedParticipants.length - 1].share += diff;
        updatedParticipants[updatedParticipants.length - 1].share = parseFloat(updatedParticipants[updatedParticipants.length - 1].share.toFixed(2));
    }

    setFormState(prev => ({...prev, participants: updatedParticipants}));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = parseFloat(formState.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      alert('Please enter a valid total amount.');
      return;
    }
    if (!formState.description.trim()) {
      alert('Description is required.');
      return;
    }
     if (formState.participants.length === 0) {
      alert('Please add at least one participant.');
      return;
    }
    if (formState.participants.some(p => !p.name.trim())) {
      alert('All participant names are required.');
      return;
    }

    const totalShares = formState.participants.reduce((sum, p) => sum + p.share, 0);
    if (Math.abs(totalShares - totalAmount) > 0.01) { // Tolerance for floating point
      alert(`Sum of shares (${formatCurrency(totalShares)}) does not match total event amount (${formatCurrency(totalAmount)}). Please adjust shares.`);
      return;
    }
    
    const totalPaidByParticipants = formState.participants.reduce((sum, p) => sum + p.paid, 0);
    if (Math.abs(totalPaidByParticipants - totalAmount) > 0.01) { // Tolerance for floating point
        alert(`Sum of amounts paid by participants (${formatCurrency(totalPaidByParticipants)}) does not match total event amount (${formatCurrency(totalAmount)}). Please adjust paid amounts.`);
        return;
    }

    // Prevent editing financial details of synced events if paidBy is 'Me' and ID indicates sync
    if (editingEvent && editingEvent.id.startsWith('expense-') && editingEvent.paidBy === 'Me') {
      // Allow description/date changes, but participant/amount changes are primarily from ExpenseTracker
      // This is a soft warning; ExpenseTracker sync will overwrite if source expense is edited.
    }


    const eventData: Omit<SplitEvent, 'id'> = {
      description: formState.description,
      date: formState.date,
      totalAmount,
      paidBy: formState.paidBy, // For manual events, this is user input
      participants: formState.participants.map(p => ({ ...p })), 
    };

    if (editingEvent) {
      setSplitEvents(splitEvents.map(ev => ev.id === editingEvent.id ? { ...editingEvent, ...eventData } : ev));
    } else {
      const newEvent: SplitEvent = {
        id: Date.now().toString(), // Ensure new events get a unique ID not starting with 'expense-'
        ...eventData,
      };
      setSplitEvents([...splitEvents, newEvent]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (id.startsWith('expense-')) {
        alert("This event is linked to an expense. Please delete the original expense from the 'Expenses' tab to remove this entry.");
        return;
    }
    if (window.confirm('Are you sure you want to delete this split event? This action cannot be undone.')) {
      setSplitEvents(splitEvents.filter(ev => ev.id !== id));
    }
  };
  
  const openSettleModal = (friend: FriendBalance) => {
    setSettlingFriend(friend);
    setIsSettleModalOpen(true);
  };

  const handleConfirmSettlement = () => {
    if (!settlingFriend) return;

    const absBalance = Math.abs(settlingFriend.balance);
    let settlementEvent: SplitEvent;

    if (settlingFriend.balance < 0) { // Friend owes Me (balance is negative)
      settlementEvent = {
        id: `settlement-${Date.now()}`,
        description: `Settlement: ${settlingFriend.name} paid ${formatCurrency(absBalance)} to Me`,
        date: new Date().toISOString().split('T')[0],
        totalAmount: absBalance,
        paidBy: settlingFriend.name, // Friend is making the payment
        participants: [
          { name: settlingFriend.name, share: 0, paid: absBalance }, // Friend paid, their share of this "settlement expense" is 0
          { name: 'Me', share: absBalance, paid: 0 }, // Me received, my "share of this income" is absBalance
        ],
      };
    } else { // I owe Friend (balance is positive)
      settlementEvent = {
        id: `settlement-${Date.now()}`,
        description: `Settlement: Me paid ${formatCurrency(absBalance)} to ${settlingFriend.name}`,
        date: new Date().toISOString().split('T')[0],
        totalAmount: absBalance,
        paidBy: 'Me', // I am making the payment
        participants: [
          { name: settlingFriend.name, share: absBalance, paid: 0 }, // Friend received, their share of this "settlement income" is absBalance
          { name: 'Me', share: 0, paid: absBalance }, // Me paid, my share of this "settlement expense" is 0
        ],
      };
    }
    setSplitEvents(prev => [...prev, settlementEvent]);
    setIsSettleModalOpen(false);
    setSettlingFriend(null);
  };


  const friendBalances: FriendBalance[] = splitEvents.reduce((acc, event) => {
    event.participants.forEach(p => {
      if (p.name.toLowerCase() !== 'me') { 
        // balance = total_paid_by_friend_for_all_events - total_share_of_friend_in_all_events
        // Positive balance means friend paid more than their share (I owe them)
        // Negative balance means friend paid less than their share (They owe me)
        const balanceEffect = p.paid - p.share; 
        
        const existingFriend = acc.find(fb => fb.name === p.name);
        if (existingFriend) {
          existingFriend.balance += balanceEffect;
        } else {
          acc.push({ name: p.name, balance: balanceEffect });
        }
      }
    });
    return acc;
  }, [] as FriendBalance[]).filter(fb => Math.abs(fb.balance) > 0.005); // Filter out balances very close to zero


  const totalYouOweToFriends = friendBalances
    .filter(fb => fb.balance > 0) // Positive balance means friend overpaid relative to their share across events => you owe them.
    .reduce((sum, fb) => sum + fb.balance, 0);

  const totalFriendsOweToYou = friendBalances
    .filter(fb => fb.balance < 0) // Negative balance means friend underpaid relative to their share across events => they owe you.
    .reduce((sum, fb) => sum + Math.abs(fb.balance), 0);


  return (
    <div className="space-y-6">
      <Card title="Group Expense Splitter & Ledger" actions={<Button onClick={openModalForNew} leftIcon={<PlusCircleIcon />}>New Manual Split Event</Button>}>
        <h3 className="text-xl font-semibold text-content mb-4">Overall Balances</h3>
        
        <div className="mb-6 p-4 border border-base-300 rounded-lg bg-base-200 shadow">
          <h4 className="text-lg font-medium text-content mb-3">Net Summary:</h4>
          <div className="space-y-2">
            <p className="flex justify-between items-center text-md">
              <span className="text-content-secondary">Net Amount You Owe to Friends:</span>
              <span className={`font-bold ${totalYouOweToFriends > 0 ? 'text-red-500' : 'text-content'}`}>
                {formatCurrency(totalYouOweToFriends)}
              </span>
            </p>
            <p className="flex justify-between items-center text-md">
              <span className="text-content-secondary">Net Amount Friends Owe to You:</span>
              <span className={`font-bold ${totalFriendsOweToYou > 0 ? 'text-green-600' : 'text-content'}`}>
                {formatCurrency(totalFriendsOweToYou)}
              </span>
            </p>
          </div>
        </div>
        
        <h4 className="text-lg font-medium text-content mb-3">Detailed Balances with Friends:</h4>
        {friendBalances.length === 0 ? (
          <p className="text-content-secondary">All settled up or no splits involving friends yet!</p>
        ) : (
          <ul className="space-y-3">
            {friendBalances.map(fb => (
              <li key={fb.name} className={`p-3 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm ${fb.balance > 0 ? 'bg-red-50 border-l-4 border-red-500 text-red-700' : 'bg-green-50 border-l-4 border-green-500 text-green-700'}`}>
                <div>
                    <span className="font-semibold">{fb.name}</span>
                    <span className="block sm:inline ml-0 sm:ml-2">
                    {fb.balance > 0 ? `You owe ${formatCurrency(Math.abs(fb.balance))}` : `Owes you ${formatCurrency(Math.abs(fb.balance))}`}
                    </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => openSettleModal(fb)} className="mt-2 sm:mt-0 border-current text-current hover:bg-opacity-20">
                    <CheckBadgeIcon className="w-4 h-4 mr-1"/> Settle Up
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="All Events History (Expenses & Settlements)">
        {splitEvents.length === 0 ? (
          <p className="text-content-secondary text-center py-4">No split events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-base-300">
              <thead className="bg-base-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Paid By (Initial)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Participants (Shares)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-content-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-base-200 divide-y divide-base-300">
                {splitEvents.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((event) => (
                  <tr key={event.id} className="hover:bg-base-300">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-content">{new Date(event.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-content font-medium max-w-[200px] truncate" title={event.description}>{event.description}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-content">{formatCurrency(event.totalAmount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-content max-w-[100px] truncate" title={event.paidBy}>{event.paidBy || '-'}</td>
                    <td className="px-4 py-3 text-sm text-content max-w-[250px] truncate" title={event.participants.map(p => `${p.name} (Share: ${formatCurrency(p.share)}, Paid: ${formatCurrency(p.paid)})`).join('; ')}>{event.participants.map(p => p.name).join(', ')}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                       {!event.id.startsWith('settlement-') && // Do not allow editing settlements for now
                        <Button size="sm" variant="ghost" onClick={() => openModalForEdit(event)} aria-label="Edit Event"><PencilIcon /></Button>
                       }
                      {!event.id.startsWith('expense-') && // Synced expense events deleted from ExpenseTracker
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(event.id)} className="text-red-600 hover:text-red-700" aria-label="Delete Event"><TrashIcon /></Button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent ? "Edit Manual Split Event" : "New Manual Split Event"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingEvent && (editingEvent?.id?.startsWith('expense-') ?? false) && (
            <p className="p-2 bg-blue-100 text-blue-700 text-sm rounded-md">
                Note: This event is synced from an expense. Financial details (amounts, participants) are primarily managed in the 'Expenses' tab. Changes here might be overwritten if the original expense is re-saved.
            </p>
          )}
          <Input label="Description" name="description" value={formState.description} onChange={handleInputChange} required />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Date" name="date" type="date" value={formState.date} onChange={handleInputChange} required />
            <Input label={`Total Event Amount (${DEFAULT_CURRENCY})`} name="totalAmount" type="number" min="0.01" step="0.01" value={formState.totalAmount} onChange={handleInputChange} required 
                   disabled={(editingEvent?.id?.startsWith('expense-') ?? false)}/>
            <Input label="Paid By (Informational: Who covered the bill initially?)" name="paidBy" value={formState.paidBy} onChange={handleInputChange} placeholder="e.g., Me, Friend's Name, Joint Account" 
                   disabled={(editingEvent?.id?.startsWith('expense-') ?? false)}/>
          </div>
          
          <h4 className="text-md font-semibold text-content pt-2">Participants Details (Shares vs Paid for *this* event)</h4>
          {formState.participants.map((p, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center p-3 border border-base-300 rounded-md bg-base-100 shadow-sm">
              <Input containerClassName="mb-0" label={`P. ${index+1} Name`} value={p.name} onChange={(e) => handleParticipantChange(index, 'name', e.target.value)} placeholder="e.g., Me, Friend" 
                     disabled={((editingEvent?.id?.startsWith('expense-') ?? false) && p.name === 'Me')}/>
              <Input containerClassName="mb-0" label="Share Amt." title="How much this person is responsible for" type="number" min="0" step="0.01" value={p.share.toString()} onChange={(e) => handleParticipantChange(index, 'share', e.target.value)} 
                     disabled={(editingEvent?.id?.startsWith('expense-') ?? false)}/>
              <Input containerClassName="mb-0" label="Paid Amt." title="How much this person paid towards the total bill" type="number" min="0" step="0.01" value={p.paid.toString()} onChange={(e) => handleParticipantChange(index, 'paid', e.target.value)} 
                     disabled={(editingEvent?.id?.startsWith('expense-') ?? false)}/>
              <div className="flex items-end h-full justify-end pt-3 md:pt-0">
                {formState.participants.length > 1 && !((editingEvent?.id?.startsWith('expense-') ?? false)) &&
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeParticipant(index)} className="text-red-500 hover:text-red-700" aria-label="Remove Participant"><TrashIcon className="w-5 h-5"/></Button>
                }
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            {!((editingEvent?.id?.startsWith('expense-') ?? false)) && 
              <Button type="button" variant="outline" size="sm" onClick={addParticipant} leftIcon={<PlusCircleIcon className="w-4 h-4" />}>Add Participant</Button>
            }
            <Button type="button" variant="outline" size="sm" onClick={distributeSharesEqually} 
                    disabled={!formState.totalAmount || formState.participants.length === 0 || (editingEvent?.id?.startsWith('expense-') ?? false)}>
                Distribute Shares Equally
            </Button>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-base-300">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingEvent ? "Save Changes" : "Create Event"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isSettleModalOpen} onClose={() => setIsSettleModalOpen(false)} title="Settle Up" size="sm">
        {settlingFriend && (
          <div className="space-y-4">
            <p className="text-lg text-content">
              {settlingFriend.balance < 0 
                ? `${settlingFriend.name} owes you ${formatCurrency(Math.abs(settlingFriend.balance))}.`
                : `You owe ${settlingFriend.name} ${formatCurrency(settlingFriend.balance)}.`
              }
            </p>
            <p className="text-sm text-content-secondary">Marking this as settled will create a transaction to clear this balance in the ledger.</p>
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="ghost" onClick={() => setIsSettleModalOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmSettlement}>Confirm Settlement</Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default SplitterLedger;
