const express = require('express');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { protect, advocateOnly } = require('../middleware/auth');
const { generateEmployeeId, generateTempPassword } = require('../utils/idGen');

const router = express.Router();
router.use(protect);

// GET /api/employees — list workspace staff (advocates and employees can both view)
router.get('/', async (req, res, next) => {
  try {
    const employees = await User.find({ workspaceOwner: req.workspaceId, role: 'employee' }).select('-password');
    res.json(employees);
  } catch (err) { next(err); }
});

// POST /api/employees — create a new staff account (advocate only)
router.post('/', advocateOnly, async (req, res, next) => {
  try {
    const { firstName, lastName, email, employeeRole, access, assignedCases } = req.body;
    if (!firstName) return res.status(400).json({ message: "Employee's first name is required" });
    if (access === 'limited' && (!assignedCases || !assignedCases.length)) {
      return res.status(400).json({ message: 'Select at least one case for limited access, or choose full access' });
    }

    const dcId = await generateEmployeeId(firstName, lastName);
    const tempPassword = generateTempPassword();

    const employee = await User.create({
      firstName, lastName: lastName || '',
      email: email || undefined,
      dcId,
      password: tempPassword,
      role: 'employee',
      employeeRole: employeeRole || '',
      access: access || 'full',
      assignedCases: access === 'limited' ? assignedCases : [],
      workspaceOwner: req.workspaceId
    });

    await Activity.create({ workspace: req.workspaceId, user: req.user._id, text: `New team member added: ${firstName} ${lastName || ''}`.trim() });

    // Temp password is only ever returned here, at creation time — the advocate must share it out of band.
    res.status(201).json({
      id: employee._id,
      dcId: employee.dcId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeRole: employee.employeeRole,
      access: employee.access,
      tempPassword
    });
  } catch (err) { next(err); }
});

// DELETE /api/employees/:id — remove a staff account (advocate only)
router.delete('/:id', advocateOnly, async (req, res, next) => {
  try {
    const employee = await User.findOneAndDelete({ _id: req.params.id, workspaceOwner: req.workspaceId, role: 'employee' });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    await Activity.create({ workspace: req.workspaceId, user: req.user._id, text: `Team member removed: ${employee.firstName} ${employee.lastName || ''}`.trim() });
    res.json({ message: 'Employee removed' });
  } catch (err) { next(err); }
});

module.exports = router;
