# GTD Workflow Specification

## Overview

This document describes the Getting Things Done (GTD) methodology as implemented in the Todo application.

## GTD Methodology

GTD is a productivity method created by David Allen. It consists of 5 steps:

1. **Capture** - Collect all tasks, ideas, and commitments
2. **Clarify** - Process what you've captured
3. **Organize** - Put it where it belongs
4. **Engage** - Do the work
5. **Review** - Reflect and update

## Task Status Flow

```
┌─────────┐
│  Inbox  │ (Uncaptured, unprocessed tasks)
└────┬────┘
     │ Process/Capture
     ↓
┌─────────┐
│ Active  │ (Ready to do)
└────┬────┘
     │ Complete
     ↓
┌─────────────┐
│  Completed  │ (Finished tasks)
└─────────────┘

┌─────────┐
│ Waiting │ (Waiting for someone/something)
└────┬────┘
     │ Ready
     ↓
┌─────────┐
│ Active  │

┌─────────┐
│ Someday │ (Maybe later, low priority)
└────┬────┘
     │ Ready
     ↓
┌─────────┐
│ Active  │
```

## Step 1: Capture (Inbox)

### Purpose
Rapidly collect all inputs without processing.

### Implementation

**Quick Capture**
- Minimal input: title only
- Auto-assign status: `inbox`
- Auto-assign priority: `medium`
- Optional: description

**Batch Capture**
- Multiple tasks created rapidly
- Useful during meetings, phone calls

**Capture Sources**
- Manual entry (quick capture form)
- Voice input (future feature)
- Email to inbox (future feature)
- Integrations (future feature)

**Inbox Properties**
- Status: `inbox`
- Priority: `medium` (default)
- No project, context, area, tags
- No due date
- No recurrence

## Step 2: Clarify (Process)

### Purpose
Decide what each inbox item means and what to do with it.

### Clarification Flow

For each inbox item:

1. **Is it actionable?**

   **No:**
   - Delete if trash
   - Move to Someday if reference material
   - File if information to keep

   **Yes:**
   - What's the next action?
   - Can it be done in 2 minutes?
     - Do it immediately
   - Can it be delegated?
     - Set `waiting_for` field
     - Status: `waiting`
   - Is it for a specific date?
     - Set `due_date`
   - Does it need to recur?
     - Set `recurrence_type` and `recurrence_config`

2. **What context is needed?**
   - Set `context_id` (e.g., Home, Office, Phone, Computer)

3. **What project does it belong to?**
   - Set `project_id`
   - Or create new project

4. **What tags apply?**
   - Set `tag_ids` (multiple)

5. **What's the priority?**
   - Set `priority` (low, medium, high)

6. **Is it a next action?**
   - Set `is_next_action = true` if ready to do

### Process Modes

**Single Item Processing**
- Open one item at a time
- Make decisions
- Move out of inbox

**Batch Processing (Process All)**
- Open inbox
- Process each item sequentially
- Auto-advance to next item
- Clear inbox when done

## Step 3: Organize

### Purpose
Put everything in the right place for easy access.

### Organization Hierarchy

```
Area of Responsibility
    └── Project
        └── Task
            └── Subtask (optional)
```

### Areas of Responsibility

**Definition:** High-level life categories that span multiple projects.

**Examples:**
- Career
- Health & Fitness
- Family
- Finance
- Personal Development
- Home & Car
- Hobbies

**Usage:**
- Assign projects to areas
- Filter by area for high-level review
- Track progress across life domains

### Projects

**Definition:** Multi-step outcomes that require more than one action.

**Examples:**
- Launch new website
- Plan vacation
- Learn Spanish
- Renovate kitchen

**Project Lifecycle:**
1. Create project (status: active)
2. Add tasks to project
3. Work on tasks
4. Complete project (status: completed)

**Project Progress**
- Automatically calculated: `(completed_tasks / total_tasks) * 100`
- Display progress bar
- Visual motivation

### Contexts

**Definition:** Situational factors required to do the task.

**Examples:**
- @home
- @office
- @phone
- @computer
- @errands
- @anywhere

**Usage:**
- Filter tasks by context
- Context switching optimization
- "What can I do right now?"

**Best Practices:**
- Keep contexts simple (5-10 max)
- Avoid too specific contexts
- Use tags for more granular filtering

### Tags

**Definition:** Flexible, multi-dimensional categorization.

**Examples:**
- Work, Personal, Urgent, Fun, Boring, Creative
- Client A, Client B
- Phase 1, Phase 2
- High Energy, Low Energy

**Usage:**
- Multiple tags per task
- Flexible combinations
- Custom workflows

### Next Actions

**Definition:** The very next physical action required to move a project forward.

**Usage:**
- Filter by `is_next_action = true`
- Focus on actionable items
- Avoid overwhelm

**When to mark as Next Action:**
- Task is ready to do
- No dependencies blocking it
- Within current capacity

## Step 4: Engage (Execute)

### Purpose
Do the work based on context, time, and energy.

### Engagement Filters

**Context-Based:**
"What can I do right now given my context?"
- Filter by context: @office
- Filter by context: @phone
- Filter by context: @home

**Time-Based:**
"How much time do I have?"
- Quick wins (<15 min)
- Focus blocks (1-2 hours)
- Deep work (3-4 hours)

**Energy-Based:**
"What's my energy level?"
- High energy: Creative, difficult tasks
- Medium energy: Regular work
- Low energy: Administrative, easy tasks

**Priority-Based:**
"What's most important?"
- High priority items
- Due today/this week
- Next actions

### Task Execution Flow

1. **Select Task**
   - Apply filters (context, priority, energy, time)
   - Pick a next action

2. **Work on Task**
   - Focus on one task at a time
   - Use timer (Pomodoro if desired)

3. **Complete Task**
   - Mark as completed
   - Auto-move to `completed` status
   - Update project progress

4. **Follow Up**
   - Was it a recurring task?
   - Does it spawn new tasks?
   - Does project need review?

### Blocking & Delegation

**Waiting For**
- Set `waiting_for = "person or reason"`
- Status: `waiting`
- Review regularly for follow-up

**Delegation**
- Set `delegated_to = "person"`
- Optionally set `waiting_for`
- Track delegated items separately

## Step 5: Review (Weekly Review)

### Purpose
Reflect, update, and maintain system integrity.

### Review Frequency
- **Weekly Review:** Every 7 days (recommended)
- **Daily Review:** Optional, quick scan
- **Monthly Review:** Optional, strategic

### Weekly Review Checklist

**1. Get Clear**
- [ ] Process all inbox items (inbox should be empty)
- [ ] Review all waiting for items (follow up if needed)
- [ ] Review all someday items (any ready to activate?)

**2. Get Current**
- [ ] Review all projects (status, progress, next actions)
- [ ] Update project completion status
- [ ] Review upcoming due dates
- [ ] Check calendar for next week

**3. Get Creative**
- [ ] Brainstorm new projects
- [ ] Capture new ideas
- [ ] Review someday/maybe list
- [ ] Identify any new areas of focus

**4. Get Organized**
- [ ] Clean up old completed tasks (archive/delete)
- [ ] Review and update contexts
- [ ] Review and update tags
- [ ] Consolidate redundant items

**5. Get Up To Date**
- [ ] Review next actions (select for upcoming week)
- [ ] Estimate time for next actions
- [ ] Schedule time blocks for important tasks
- [ ] Set reminders for key dates

### Review Views

**Inbox Review**
- Show all inbox items
- Process each item
- Clear inbox

**Project Review**
- Show all projects with progress
- Show incomplete tasks per project
- Identify stalled projects
- Update project status

**Next Actions Review**
- Show all next actions
- Prioritize for upcoming week
- Estimate time
- Schedule if needed

**Waiting Review**
- Show all waiting items
- Check on delegated tasks
- Follow up if needed
- Reassign if necessary

**Someday Review**
- Review someday list
- Activate items if ready
- Archive if no longer relevant

## Advanced GTD Concepts

### 2-Minute Rule

**Rule:** If a task takes less than 2 minutes, do it immediately.

**Implementation:**
- During capture/clarify
- If quick, complete immediately
- Don't enter into system

### The Someday/Maybe List

**Purpose:** Store ideas and tasks for later consideration.

**When to Use:**
- Low priority items
- Future possibilities
- "Nice to have" ideas
- Not actionable now

**Status:** `someday`

**Review:** Check weekly, activate if ready

### Tickler File (Future)

**Concept:** Reminders for future dates.

**Implementation:**
- Use due dates
- Use reminders
- Review daily for today's items

### Project Planning

**Natural Planning Model:**
1. **Define purpose** - Why are we doing this?
2. **Envision outcome** - What does success look like?
3. **Brainstorm** - What are all the steps?
4. **Organize** - What's the sequence?
5. **Identify next actions** - What's first?

### Energy Management

**Energy Levels:**
- High Energy: Creative, strategic, difficult tasks
- Medium Energy: Regular work, correspondence
- Low Energy: Admin, filing, cleanup

**Implementation:**
- Tag tasks by energy level (optional)
- Filter by energy when choosing tasks
- Respect current energy state

## Recurrence Patterns

### Daily
**Use:** Habits, daily tasks
**Config:** None needed
**Example:** Take vitamins, review calendar

### Weekly
**Use:** Weekly tasks, reviews
**Config:** days_of_week [1-7]
**Example:** Weekly review, grocery shopping
```json
{
  "recurrence_type": "weekly",
  "recurrence_config": {
    "days_of_week": [1, 5]
  }
}
```

### Monthly
**Use:** Monthly bills, reviews
**Config:** day_of_month [1-31]
**Example:** Pay rent, review finances
```json
{
  "recurrence_type": "monthly",
  "recurrence_config": {
    "day_of_month": 1
  }
}
```

### Yearly
**Use:** Annual tasks, reviews
**Config:** day_of_month [1-31] + month [1-12]
**Example:** Taxes, annual review
```json
{
  "recurrence_type": "yearly",
  "recurrence_config": {
    "day_of_month": 15,
    "month": 4
  }
}
```

### Recurrence Logic

**On Completion:**
1. Mark original task as completed
2. Create new task with same properties
3. Calculate next due date based on recurrence pattern
4. Set due date on new task
5. Keep original in completed tasks for history

**Example - Daily Task:**
- Complete daily task on April 1st
- New task created automatically for April 2nd
- Due date: April 2nd

## Notification Triggers

### Reminder Time
- Task reaches `reminder_time`
- Create notification: "Task due: {title}"
- Status: `pending`

### Due Date Approaching
- Task due within 24 hours
- Create notification: "Task due soon: {title}"
- Status: `pending`

### Overdue
- Task due date passed, not completed
- Create notification: "Task overdue: {title}"
- Status: `pending`

### Recurring Task Created
- New recurring task created
- Create notification: "Recurring task: {title}"
- Status: `pending`

## Smart Features

### Auto-Organize (Future)
- Suggest context based on task title
- Suggest project based on tags
- Suggest priority based on due date

### Smart Capture (Future)
- Extract project from title ("Project: Task")
- Extract due date from title ("Task @tomorrow")
- Extract context from title ("Task @home")

### Productivity Insights (Future)
- Track completion rate
- Track time in each context
- Identify bottlenecks
- Optimize workflow

## User Experience Guidelines

### Inbox Zero
- Goal: Process all inbox items daily
- Visual indicator of inbox count
- Encourage processing with prompts

### Quick Actions
- Complete task (1 click)
- Mark as next action (1 click)
- Set waiting (quick dialog)
- Move to Someday (1 click)

### Context Awareness
- Show context hints in task list
- Filter by context with 1 click
- Suggest context based on location (future)

### Focus Mode
- Hide non-relevant tasks
- Show only next actions
- Show only current project
- Distract-free interface

### Weekly Review Reminder
- Automatic notification if review overdue
- Guided walkthrough
- Progress tracking
