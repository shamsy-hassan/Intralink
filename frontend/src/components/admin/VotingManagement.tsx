import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Vote as VoteIcon, 
  BarChart3, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle,
  PieChart,
  Trash2,
  Loader
} from 'lucide-react';
import { api } from '../../lib/api';
import type { Vote, VoteFormData, VoteResults } from '../../types';

// Simple LoadingButton component
interface LoadingButtonProps {
  loading: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({ loading, onClick, className, children }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`${className} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {loading ? (
      <div className="flex items-center justify-center space-x-2">
        <Loader className="w-4 h-4 animate-spin" />
        <span>Loading...</span>
      </div>
    ) : (
      children
    )}
  </button>
);

export const VotingManagement: React.FC = () => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'results'>('overview');
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null);
  const [voteResults, setVoteResults] = useState<VoteResults | null>(null);

  // Form state
  const [formData, setFormData] = useState<VoteFormData>({
    title: '',
    description: '',
    vote_type: 'poll',
    status: 'draft',
    options: ['', ''],
    allow_multiple_choices: false,
    show_results_before_voting: false,
    anonymous_voting: false,
    starts_at: '',
    ends_at: '',
    target_departments: null
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const votesResponse = await api.get('/votes/');
      setVotes(votesResponse.data.votes || []);
    } catch (err: any) {
      setError('Failed to load data');
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // You can implement a proper toast system here
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const handleCreateVote = async () => {
    try {
      setIsCreating(true);
      
      // Validate form
      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }
      
      const validOptions = formData.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        setError('At least 2 options are required');
        return;
      }

      const voteData = {
        ...formData,
        options: validOptions
      };

      const response = await api.post('/votes/', voteData);
      setVotes(prev => [response.data.vote, ...prev]);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        vote_type: 'poll',
        status: 'draft',
        options: ['', ''],
        allow_multiple_choices: false,
        show_results_before_voting: false,
        anonymous_voting: false,
        starts_at: '',
        ends_at: '',
        target_departments: null
      });
      
      setActiveTab('overview');
      showToast('Vote created successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create vote');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateVoteStatus = async (voteId: number, status: 'active' | 'closed' | 'draft') => {
    try {
      const response = await api.put(`/votes/${voteId}`, { status });
      setVotes(prev => prev.map(vote => 
        vote.id === voteId ? response.data.vote : vote
      ));
      showToast(`Vote ${status === 'active' ? 'activated' : status === 'closed' ? 'closed' : 'saved as draft'}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update vote');
    }
  };

  const handleDeleteVote = async (voteId: number) => {
    if (!confirm('Are you sure you want to delete this vote?')) return;
    
    try {
      await api.delete(`/votes/${voteId}`);
      setVotes(prev => prev.filter(vote => vote.id !== voteId));
      showToast('Vote deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete vote');
    }
  };

  const handleViewResults = async (vote: Vote) => {
    try {
      const response = await api.get(`/votes/${vote.id}/results`);
      setVoteResults(response.data.results);
      setSelectedVote(vote);
      setActiveTab('results');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load results');
    }
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed': return <Clock className="w-4 h-4 text-gray-500" />;
      case 'draft': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'closed': return 'text-gray-600 bg-gray-50';
      case 'draft': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voting Management</h1>
          <p className="text-gray-600">Create and manage company polls and voting</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Vote
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Content */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center">
                <VoteIcon className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {votes.length}
                  </p>
                  <p className="text-gray-600">Total Votes</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {votes.filter(v => v.status === 'active').length}
                  </p>
                  <p className="text-gray-600">Active</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {votes.filter(v => v.status === 'draft').length}
                  </p>
                  <p className="text-gray-600">Drafts</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {votes.reduce((sum, vote) => sum + vote.total_votes, 0)}
                  </p>
                  <p className="text-gray-600">Total Responses</p>
                </div>
              </div>
            </div>
          </div>

          {/* Votes List */}
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-gray-900">All Votes</h2>
            </div>
            
            <div className="divide-y">
              {votes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <VoteIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No votes created yet</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="text-blue-600 hover:text-blue-800 mt-2"
                  >
                    Create your first vote
                  </button>
                </div>
              ) : (
                votes.map((vote) => (
                  <div key={vote.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            {vote.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vote.status)}`}>
                            {getStatusIcon(vote.status)}
                            <span className="ml-1">{vote.status.charAt(0).toUpperCase() + vote.status.slice(1)}</span>
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            vote.vote_type === 'poll' ? 'bg-blue-50 text-blue-600' :
                            vote.vote_type === 'issue' ? 'bg-red-50 text-red-600' :
                            'bg-green-50 text-green-600'
                          }`}>
                            {vote.vote_type.charAt(0).toUpperCase() + vote.vote_type.slice(1)}
                          </span>
                        </div>
                        
                        {vote.description && (
                          <p className="text-gray-600 mt-1">{vote.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{vote.options.length} options</span>
                          <span>{vote.total_votes} responses</span>
                          <span>by {vote.creator_name}</span>
                          <span>{new Date(vote.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewResults(vote)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Results"
                        >
                          <PieChart className="w-4 h-4" />
                        </button>
                        
                        {vote.status === 'draft' && (
                          <button
                            onClick={() => handleUpdateVoteStatus(vote.id, 'active')}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                            title="Activate Vote"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {vote.status === 'active' && (
                          <button
                            onClick={() => handleUpdateVoteStatus(vote.id, 'closed')}
                            className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
                            title="Close Vote"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteVote(vote.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Vote"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'create' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-white rounded-lg border p-6 space-y-6">
            <h2 className="text-xl font-medium text-gray-900">Create New Vote</h2>
            
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter vote title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional description..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.vote_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, vote_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="poll">Poll</option>
                    <option value="issue">Issue</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options *
              </label>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Option ${index + 1}...`}
                    />
                    {formData.options.length > 2 && (
                      <button
                        onClick={() => removeOption(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addOption}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Option
                </button>
              </div>
            </div>
            
            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Settings</h3>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.allow_multiple_choices}
                    onChange={(e) => setFormData(prev => ({ ...prev, allow_multiple_choices: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow multiple choices</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.show_results_before_voting}
                    onChange={(e) => setFormData(prev => ({ ...prev, show_results_before_voting: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show results before voting</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.anonymous_voting}
                    onChange={(e) => setFormData(prev => ({ ...prev, anonymous_voting: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Anonymous voting</span>
                </label>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                onClick={() => setActiveTab('overview')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <LoadingButton
                loading={isCreating}
                onClick={handleCreateVote}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Vote
              </LoadingButton>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'results' && selectedVote && voteResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-gray-900">{selectedVote.title}</h2>
              <p className="text-gray-600">Vote Results</p>
            </div>
            <button
              onClick={() => setActiveTab('overview')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Overview
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Results Chart */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Results Breakdown</h3>
              <div className="space-y-4">
                {Object.entries(voteResults.options).map(([option, count]) => {
                  const percentage = voteResults.total_voters > 0 ? (count / voteResults.total_voters) * 100 : 0;
                  return (
                    <div key={option}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{option}</span>
                        <span className="text-gray-500">{count} votes ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                Total voters: {voteResults.total_voters}
              </div>
            </div>
            
            {/* Department Breakdown */}
            {Object.keys(voteResults.votes_by_department).length > 0 && (
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">By Department</h3>
                <div className="space-y-3">
                  {Object.entries(voteResults.votes_by_department).map(([dept, count]) => (
                    <div key={dept} className="flex justify-between">
                      <span className="text-gray-700">{dept}</span>
                      <span className="text-gray-500">{count} voters</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Timeline */}
            <div className="bg-white rounded-lg border p-6 lg:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Voting Timeline</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {voteResults.timeline.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm py-2 border-b last:border-b-0">
                    <div>
                      <span className="font-medium">{entry.voter}</span>
                      {entry.department && (
                        <span className="text-gray-500 ml-2">({entry.department})</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-gray-700">{entry.options.join(', ')}</div>
                      <div className="text-gray-500">{new Date(entry.voted_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};