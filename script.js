let employeeData = null;
let currentDate = new Date();
let generatedSchedule = {};
let shiftConfig = {
    weekday: { start: '16:30', end: '18:30' },
    weekend: { start: '08:30', end: '17:30' }
};

// Set to next month by default
currentDate.setMonth(currentDate.getMonth() + 1);

const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function saveShiftConfig() {
    const weekdayStart = document.getElementById('weekdayStart').value;
    const weekdayEnd = document.getElementById('weekdayEnd').value;
    const weekendStart = document.getElementById('weekendStart').value;
    const weekendEnd = document.getElementById('weekendEnd').value;
    
    // Validate time inputs
    if (!weekdayStart || !weekdayEnd || !weekendStart || !weekendEnd) {
        showMessage('กรุณากรอกเวลาให้ครบถ้วน', 'error');
        return;
    }
    
    // Validate that end time is after start time
    if (weekdayStart >= weekdayEnd) {
        showMessage('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น (วันธรรมดา)', 'error');
        return;
    }
    
    if (weekendStart >= weekendEnd) {
        showMessage('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น (วันหยุด)', 'error');
        return;
    }
    
    shiftConfig = {
        weekday: { start: weekdayStart, end: weekdayEnd },
        weekend: { start: weekendStart, end: weekendEnd }
    };
    
    // Clear existing schedule when config changes
    generatedSchedule = {};
    
    // Update calendar and stats
    updateCalendar();
    updateStats();
    
    // Show success message
    const configStatus = document.getElementById('configStatus');
    configStatus.style.display = 'inline';
    setTimeout(() => {
        configStatus.style.display = 'none';
    }, 3000);
    
    showMessage('บันทึกการตั้งค่าเวลาเวรสำเร็จ', 'success');
}

function resetShiftConfig() {
    document.getElementById('weekdayStart').value = '16:30';
    document.getElementById('weekdayEnd').value = '18:30';
    document.getElementById('weekendStart').value = '08:30';
    document.getElementById('weekendEnd').value = '17:30';
    
    shiftConfig = {
        weekday: { start: '16:30', end: '18:30' },
        weekend: { start: '08:30', end: '17:30' }
    };
    
    // Clear existing schedule when config changes
    generatedSchedule = {};
    
    // Update calendar and stats
    updateCalendar();
    updateStats();
    
    showMessage('รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นแล้ว', 'success');
}

function calculateShiftHours(dayOfWeek) {
    const config = (dayOfWeek === 0 || dayOfWeek === 6) ? shiftConfig.weekend : shiftConfig.weekday;
    
    const startTime = config.start.split(':');
    const endTime = config.end.split(':');
    
    const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
    const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
    
    let diffMinutes = endMinutes - startMinutes;
    
    // Handle overnight shifts
    if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // Add 24 hours
    }
    
    return diffMinutes / 60; // Convert to hours
}

function getShiftTimeDisplay(dayOfWeek) {
    const config = (dayOfWeek === 0 || dayOfWeek === 6) ? shiftConfig.weekend : shiftConfig.weekday;
    return `${config.start}-${config.end}`;
}

function handleFileSelect(input) {
    const fileButton = document.getElementById('fileInputButton');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    
    if (input.files && input.files[0]) {
        const fileName = input.files[0].name;
        
        // Update button appearance
        fileButton.classList.add('file-selected');
        fileButton.innerHTML = `
            <svg class="file-upload-icon" viewBox="0 0 24 24">
                <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.76L18.88,4.88L21.71,7.71L9,20.42Z" />
            </svg>
            ไฟล์ที่เลือก
        `;
        
        // Show file name
        fileNameDisplay.textContent = `📄 ${fileName}`;
        fileNameDisplay.style.display = 'block';
    } else {
        // Reset button appearance
        fileButton.classList.remove('file-selected');
        fileButton.innerHTML = `
            <svg class="file-upload-icon" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                <path d="M12,11L16,15H13V19H11V15H8L12,11Z" />
            </svg>
            เลือกไฟล์ JSON
        `;
        
        // Hide file name
        fileNameDisplay.style.display = 'none';
    }
}

function initializeApp() {
    updateCalendar();
    updateStats();
}

function importJSON() {
    const fileInput = document.getElementById('jsonFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('กรุณาเลือกไฟล์ JSON', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            employeeData = JSON.parse(e.target.result);
            validateEmployeeData();
            updateStats();
            showMessage('นำเข้าข้อมูลสำเร็จ', 'success');
        } catch (error) {
            showMessage('ไฟล์ JSON ไม่ถูกต้อง: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

function validateEmployeeData() {
    if (!employeeData || !employeeData.groups) {
        throw new Error('โครงสร้างไฟล์ไม่ถูกต้อง ต้องมี groups');
    }
    
    const groups = Object.keys(employeeData.groups);
    if (groups.length === 0) {
        throw new Error('ต้องมีอย่างน้อย 1 กลุ่ม');
    }
}

function exportSampleJSON() {
    const sampleData = {
        "_comment": "ไฟล์ตัวอย่างสำหรับระบบจัดตารางเวรพนักงาน (เวอร์ชันปรับปรุง)",
        "_instructions": {
            "shift_times": "ช่วงเวลาเวรสามารถกำหนดได้ในหน้าระบบ ไม่ต้องระบุในไฟล์ JSON",
            "groups": "แบ่งกลุ่มพนักงาน เช่น Network, Lab หรือกลุ่มอื่นๆ - แต่ละกลุ่มจะมีคนอยู่เวรทุกวัน",
            "assignment_priority": "ระบบจะจัดเวรตามลำดับ: 1) ปกติ 2) เกินข้อจำกัด 3) ฉุกเฉิน (ลาแต่ต้องมา)",
            "workload_balancing": "ระบบคำนวณภาระงานโดยคำนึงถึงวันลา คนที่ลาน้อยจะได้งานมากกว่าอย่างยุติธรรม",
            "realistic_averages": "ชั่วโมงเฉลี่ยที่แสดงจะสะท้อนความเป็นจริง คำนึงถึงการลาและข้อจำกัดของแต่ละคน",
            "leavedays": "วันลาของพนักงาน ระบุเป็น YYYY-MM-DD - ถ้าจำเป็นจะถูกเรียกมาทำงานแบบฉุกเฉิน",
            "restrictions": {
                "no_weekends": "true = ไม่สามารถทำงานเสาร์-อาทิตย์ (แต่อาจถูกบังคับถ้าจำเป็น)",
                "no_weekdays": "true = ไม่สามารถทำงานจันทร์-ศุกร์ (แต่อาจถูกบังคับถ้าจำเป็น)",
                "no_specific_days": "วันที่ไม่สามารถทำงาน: sunday, monday, tuesday, wednesday, thursday, friday, saturday"
            },
            "fairness_note": "เมื่อมีคนลาบ่อย คนอื่นในกลุ่มเดียวกันจะต้องทำงานมากขึ้นเพื่อครอบคลุมเวร"
        },
        groups: {
            "Network": [
                {
                    id: 1,
                    name: "สมชาย ใจดี",
                    leavedays: ["2025-07-15", "2025-07-20"],
                    restrictions: {
                        no_weekends: false,
                        no_weekdays: false,
                        no_specific_days: []
                    }
                },
                {
                    id: 2,
                    name: "สมหญิง รักงาน",
                    leavedays: ["2025-07-10"],
                    restrictions: {
                        no_weekends: true,
                        no_weekdays: false,
                        no_specific_days: ["monday"]
                    }
                },
                {
                    id: 3,
                    name: "วิทยา เก่งเทค",
                    leavedays: [],
                    restrictions: {
                        no_weekends: false,
                        no_weekdays: false,
                        no_specific_days: []
                    }
                },
                {
                    id: 4,
                    name: "ธนา เทคโน",
                    leavedays: ["2025-07-05", "2025-07-12", "2025-07-26", "2025-07-27"],
                    restrictions: {
                        no_weekends: false,
                        no_weekdays: false,
                        no_specific_days: ["friday"]
                    }
                }
            ],
            "Lab": [
                {
                    id: 5,
                    name: "อรุณ ชำนาญ",
                    leavedays: ["2025-07-25"],
                    restrictions: {
                        no_weekends: false,
                        no_weekdays: false,
                        no_specific_days: []
                    }
                },
                {
                    id: 6,
                    name: "วันเพ็ญ เพียร",
                    leavedays: [],
                    restrictions: {
                        no_weekends: false,
                        no_weekdays: true,
                        no_specific_days: []
                    }
                },
                {
                    id: 7,
                    name: "กิตติ ขยัน",
                    leavedays: ["2025-07-18", "2025-07-19"],
                    restrictions: {
                        no_weekends: false,
                        no_weekdays: false,
                        no_specific_days: ["friday"]
                    }
                },
                {
                    id: 8,
                    name: "มาลี รอบรู้",
                    leavedays: ["2025-07-08", "2025-07-22", "2025-07-29"],
                    restrictions: {
                        no_weekends: false,
                        no_weekdays: false,
                        no_specific_days: []
                    }
                }
            ]
        }
    };

    const dataStr = JSON.stringify(sampleData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employee_data_sample.json';
    link.click();
    URL.revokeObjectURL(url);
}

function updateStats() {
    const networkCount = employeeData ? (employeeData.groups.Network || []).length : 0;
    const labCount = employeeData ? (employeeData.groups.Lab || []).length : 0;
    const totalEmployees = networkCount + labCount;
    const totalGroups = Object.keys(employeeData?.groups || {}).length;
    
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    let totalDays = 0;
    let totalHours = 0;
    let weekdaysCount = 0;
    let weekendsCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayOfWeek = date.getDay();
        totalDays++;
        
        const shiftHours = calculateShiftHours(dayOfWeek);
        totalHours += shiftHours;
        
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            weekendsCount++;
        } else {
            weekdaysCount++;
        }
    }

    // Calculate realistic averages considering leave days
    const realisticAverages = calculateRealisticAverages();
    const totalShiftHours = totalHours * totalGroups;

    // Update all stat cards
    document.getElementById('totalEmployees').textContent = totalEmployees;
    document.getElementById('networkCount').textContent = networkCount;
    document.getElementById('labCount').textContent = labCount;
    document.getElementById('totalDays').textContent = totalDays;
    document.getElementById('weekdaysCount').textContent = weekdaysCount;
    document.getElementById('weekendsCount').textContent = weekendsCount;
    document.getElementById('totalHours').textContent = Math.round(totalShiftHours * 10) / 10;
    document.getElementById('avgHoursPerPerson').textContent = Math.round(realisticAverages.overall * 10) / 10;
    document.getElementById('networkAvgHours').textContent = Math.round(realisticAverages.network * 10) / 10;
    document.getElementById('labAvgHours').textContent = Math.round(realisticAverages.lab * 10) / 10;
    document.getElementById('avgHoursPerDay').textContent = Math.round((totalShiftHours / totalDays) * 10) / 10;
    document.getElementById('coverageRate').textContent = calculateCoverageRate() + '%';
    
    // Apply dynamic styling based on values
    updateStatCardStyles(calculateCoverageRate(), totalEmployees, realisticAverages);
}

function calculateRealisticAverages() {
    if (!employeeData) {
        return { overall: 0, network: 0, lab: 0 };
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let totalAvailableHours = 0;
    let totalAvailableEmployees = 0;
    let networkTotalHours = 0;
    let networkAvailableEmployees = 0;
    let labTotalHours = 0;
    let labAvailableEmployees = 0;

    Object.keys(employeeData.groups).forEach(groupName => {
        const employees = employeeData.groups[groupName];
        
        employees.forEach(employee => {
            let availableHours = 0;
            let effectiveWorkDays = 0;
            
            // Calculate available work days for this employee
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayOfWeek = date.getDay();
                
                // Count as available if not on leave (restrictions can be overridden)
                if (!isEmployeeOnLeave(employee, dateStr)) {
                    const shiftHours = calculateShiftHours(dayOfWeek);
                    availableHours += shiftHours;
                    effectiveWorkDays++;
                }
            }
            
            // Calculate expected hours for this employee
            // They need to cover their share of the group's total responsibility
            const groupSize = employees.length;
            const groupTotalDays = daysInMonth; // Group must cover all days
            const expectedWorkDays = groupTotalDays / groupSize; // Fair share
            
            // Adjust for their actual availability
            const adjustmentFactor = effectiveWorkDays > 0 ? Math.min(groupTotalDays / (groupSize * effectiveWorkDays), 2.0) : 0;
            const expectedHours = availableHours * adjustmentFactor;
            
            totalAvailableHours += expectedHours;
            totalAvailableEmployees++;
            
            if (groupName === 'Network') {
                networkTotalHours += expectedHours;
                networkAvailableEmployees++;
            } else if (groupName === 'Lab') {
                labTotalHours += expectedHours;
                labAvailableEmployees++;
            }
        });
    });

    return {
        overall: totalAvailableEmployees > 0 ? totalAvailableHours / totalAvailableEmployees : 0,
        network: networkAvailableEmployees > 0 ? networkTotalHours / networkAvailableEmployees : 0,
        lab: labAvailableEmployees > 0 ? labTotalHours / labAvailableEmployees : 0
    };
}

function updateStatCardStyles(coverageRate, totalEmployees, realisticAverages) {
    // Reset all card styles
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
        card.classList.remove('stat-highlight', 'stat-warning', 'stat-danger');
    });
    
    // Coverage rate styling
    const coverageCard = document.getElementById('coverageRate').closest('.stat-card');
    if (coverageRate >= 95) {
        coverageCard.classList.add('stat-highlight');
    } else if (coverageRate >= 80) {
        coverageCard.classList.add('stat-warning');
    } else if (coverageRate > 0) {
        coverageCard.classList.add('stat-danger');
    }
    
    // Total employees styling
    const totalEmpCard = document.getElementById('totalEmployees').closest('.stat-card');
    if (totalEmployees >= 10) {
        totalEmpCard.classList.add('stat-highlight');
    } else if (totalEmployees >= 5) {
        totalEmpCard.classList.add('stat-warning');
    } else if (totalEmployees > 0) {
        totalEmpCard.classList.add('stat-danger');
    }
    
    // Highlight average hours if they seem balanced
    if (realisticAverages && realisticAverages.network > 0 && realisticAverages.lab > 0) {
        const difference = Math.abs(realisticAverages.network - realisticAverages.lab);
        const avgTotal = (realisticAverages.network + realisticAverages.lab) / 2;
        const percentDiff = avgTotal > 0 ? (difference / avgTotal) * 100 : 0;
        
        if (percentDiff <= 15) { // Less than 15% difference means reasonable balance
            document.getElementById('networkAvgHours').closest('.stat-card').classList.add('stat-highlight');
            document.getElementById('labAvgHours').closest('.stat-card').classList.add('stat-highlight');
        } else if (percentDiff <= 25) {
            document.getElementById('networkAvgHours').closest('.stat-card').classList.add('stat-warning');
            document.getElementById('labAvgHours').closest('.stat-card').classList.add('stat-warning');
        } else {
            document.getElementById('networkAvgHours').closest('.stat-card').classList.add('stat-danger');
            document.getElementById('labAvgHours').closest('.stat-card').classList.add('stat-danger');
        }
    }
}

function calculateCoverageRate() {
    if (!employeeData || Object.keys(generatedSchedule).length === 0) {
        return 0;
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const targetGroupCount = Object.keys(employeeData.groups).length;
    
    let totalExpectedAssignments = 0;
    let actualAssignments = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        totalExpectedAssignments += targetGroupCount;
        
        if (generatedSchedule[dateStr]) {
            actualAssignments += generatedSchedule[dateStr].length;
        }
    }
    
    if (totalExpectedAssignments === 0) return 0;
    
    return Math.round((actualAssignments / totalExpectedAssignments) * 100);
}

function updateCalendar() {
    const calendar = document.getElementById('calendar');
    const monthTitle = document.getElementById('monthTitle');
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    monthTitle.textContent = `${thaiMonths[month]} ${year + 543}`;
    
    calendar.innerHTML = '';
    
    // Add day headers
    thaiDays.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.textContent = day;
        calendar.appendChild(header);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.innerHTML = `<div class="day-number">${daysInPrevMonth - i}</div>`;
        calendar.appendChild(dayDiv);
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        
        dayDiv.className = 'calendar-day';
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayDiv.classList.add('weekend');
        }
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        let dayContent = `<div class="day-number">${day}</div>`;
        
        // Add shift times based on configuration
        const shiftTime = getShiftTimeDisplay(dayOfWeek);
        dayContent += `<div class="shift-time">${shiftTime}</div>`;
        
        // Add assigned employees if schedule is generated
        if (generatedSchedule[dateStr]) {
            const assignments = generatedSchedule[dateStr];
            const targetCount = Object.keys(employeeData?.groups || {}).length;
            
            assignments.forEach(assignment => {
                let cssClass = assignment.group.toLowerCase();
                let statusText = '';
                
                switch (assignment.type) {
                    case 'override_restriction':
                        cssClass += ' override';
                        statusText = ' ⚠️';
                        break;
                    case 'emergency':
                        cssClass += ' emergency';
                        statusText = ' 🚨';
                        break;
                    case 'normal':
                    default:
                        // No additional styling for normal assignments
                        break;
                }
                
                dayContent += `<div class="shift-person ${cssClass}">${assignment.group}: ${assignment.name}${statusText}</div>`;
            });
            
            // Show assignment type summary
            const overrideCount = assignments.filter(a => a.type === 'override_restriction').length;
            const emergencyCount = assignments.filter(a => a.type === 'emergency').length;
            
            if (emergencyCount > 0) {
                dayContent += `<div class="assignment-warning">🚨 มีการจัดเวรฉุกเฉิน ${emergencyCount} คน</div>`;
            } else if (overrideCount > 0) {
                dayContent += `<div class="assignment-info">⚠️ เกินข้อจำกัด ${overrideCount} คน</div>`;
            }
            
            // Show day statistics
            dayContent += `<div class="day-stats">รวม ${assignments.length}/${targetCount} คน</div>`;
        }
        
        dayDiv.innerHTML = dayContent;
        calendar.appendChild(dayDiv);
    }
    
    // Add next month's leading days
    const totalCells = calendar.children.length - 7; // Subtract headers
    const remainingCells = 42 - totalCells; // 6 rows * 7 days - current cells
    
    for (let day = 1; day <= remainingCells; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.innerHTML = `<div class="day-number">${day}</div>`;
        calendar.appendChild(dayDiv);
    }
}

function generateSchedule() {
    if (!employeeData) {
        showMessage('กรุณา Import ข้อมูลบุคลากรก่อน', 'error');
        return;
    }

    try {
        generatedSchedule = {};
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const targetGroupCount = Object.keys(employeeData.groups).length;
        
        // Calculate workload distribution
        const workloadData = calculateWorkloadDistribution();
        
        let totalAssignments = 0;
        let normalAssignments = 0;
        let overrideAssignments = 0;
        let emergencyAssignments = 0;
        
        // Generate assignments for each day
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOfWeek = date.getDay();
            
            const assignments = assignEmployeesForDay(dateStr, dayOfWeek, workloadData);
            if (assignments.length > 0) {
                generatedSchedule[dateStr] = assignments;
                totalAssignments += assignments.length;
                
                // Count assignment types
                assignments.forEach(assignment => {
                    switch (assignment.type) {
                        case 'normal':
                            normalAssignments++;
                            break;
                        case 'override_restriction':
                            overrideAssignments++;
                            break;
                        case 'emergency':
                            emergencyAssignments++;
                            break;
                    }
                });
            }
        }
        
        updateCalendar();
        
        // Show comprehensive result message
        const expectedAssignments = daysInMonth * targetGroupCount;
        let message = `สร้างตารางเวรสำเร็จ (${totalAssignments}/${expectedAssignments} คน)`;
        let messageType = 'success';
        
        if (emergencyAssignments > 0 || overrideAssignments > 0) {
            message += `\n📊 รายละเอียด:`;
            message += `\n✅ ปกติ: ${normalAssignments} ครั้ง`;
            
            if (overrideAssignments > 0) {
                message += `\n⚠️ เกินข้อจำกัด: ${overrideAssignments} ครั้ง`;
            }
            
            if (emergencyAssignments > 0) {
                message += `\n🚨 ฉุกเฉิน (ลาแต่ต้องมาทำงาน): ${emergencyAssignments} ครั้ง`;
                messageType = 'warning';
            } else if (overrideAssignments > 0) {
                messageType = 'warning';
            }
        }
        
        // Add coverage rate
        const coverageRate = Math.round((totalAssignments / expectedAssignments) * 100);
        message += `\n📈 อัตราครอบคลุม: ${coverageRate}%`;
        
        showMessage(message, messageType);
        
    } catch (error) {
        showMessage('เกิดข้อผิดพลาดในการสร้างตารางเวร: ' + error.message, 'error');
    }
}

function calculateWorkloadDistribution() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const workloadData = {};
    
    // Calculate realistic target hours per employee in each group
    Object.keys(employeeData.groups).forEach(groupName => {
        const employees = employeeData.groups[groupName];
        const groupData = [];
        
        let totalAvailableCapacity = 0;
        let totalGroupResponsibility = 0;
        
        // First pass: calculate each employee's availability and group's total responsibility
        employees.forEach(emp => {
            let availableHours = 0;
            let availableDays = 0;
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayOfWeek = date.getDay();
                const shiftHours = calculateShiftHours(dayOfWeek);
                
                totalGroupResponsibility += shiftHours; // Group must cover this
                
                // Count employee's available capacity (not on leave)
                if (!isEmployeeOnLeave(emp, dateStr)) {
                    availableHours += shiftHours;
                    availableDays++;
                }
            }
            
            totalAvailableCapacity += availableHours;
            
            groupData.push({
                ...emp,
                assignedHours: 0,
                availableHours: availableHours,
                availableDays: availableDays,
                targetHours: 0 // Will calculate in second pass
            });
        });
        
        // Second pass: distribute workload based on availability
        const totalResponsibilityPerEmployee = totalGroupResponsibility / employees.length;
        
        groupData.forEach(emp => {
            if (totalAvailableCapacity > 0) {
                // Distribute workload proportionally to availability
                const capacityRatio = emp.availableHours / totalAvailableCapacity;
                emp.targetHours = totalGroupResponsibility * capacityRatio;
            } else {
                // If no one is available, distribute equally (emergency mode)
                emp.targetHours = totalResponsibilityPerEmployee;
            }
        });
        
        workloadData[groupName] = {
            employees: groupData,
            totalHours: totalGroupResponsibility,
            totalAvailableCapacity: totalAvailableCapacity
        };
    });
    
    return workloadData;
}

function assignEmployeesForDay(dateStr, dayOfWeek, workloadData) {
    const assignments = [];
    const shiftHours = calculateShiftHours(dayOfWeek);
    
    // Assign one person from each group - MANDATORY, no skipping allowed
    Object.keys(employeeData.groups).forEach(groupName => {
        const groupData = workloadData[groupName];
        let selectedEmployee = null;
        let assignmentType = 'normal';
        
        // Priority 1: Find available employees (no restrictions/leave conflicts)
        const availableEmployees = groupData.employees.filter(emp => 
            isEmployeeAvailable(emp, dateStr, dayOfWeek)
        );
        
        if (availableEmployees.length > 0) {
            // Sort by workload to balance assignments
            availableEmployees.sort((a, b) => a.assignedHours - b.assignedHours);
            selectedEmployee = availableEmployees[0];
            assignmentType = 'normal';
        } else {
            // Priority 2: Find employees with only restriction conflicts (not on leave)
            const notOnLeaveEmployees = groupData.employees.filter(emp => 
                !isEmployeeOnLeave(emp, dateStr)
            );
            
            if (notOnLeaveEmployees.length > 0) {
                // Sort by workload among those not on leave
                notOnLeaveEmployees.sort((a, b) => a.assignedHours - b.assignedHours);
                selectedEmployee = notOnLeaveEmployees[0];
                assignmentType = 'override_restriction';
            } else {
                // Priority 3: Emergency assignment - even if on leave (last resort)
                // Sort all employees by workload
                const allEmployees = [...groupData.employees];
                allEmployees.sort((a, b) => a.assignedHours - b.assignedHours);
                selectedEmployee = allEmployees[0];
                assignmentType = 'emergency';
            }
        }
        
        // Assign the selected employee
        if (selectedEmployee) {
            selectedEmployee.assignedHours += shiftHours;
            
            assignments.push({
                group: groupName,
                name: selectedEmployee.name,
                hours: shiftHours,
                type: assignmentType
            });
        }
    });
    
    return assignments;
}

function isEmployeeOnLeave(employee, dateStr) {
    return employee.leavedays && employee.leavedays.includes(dateStr);
}

function isEmployeeAvailable(employee, dateStr, dayOfWeek) {
    // Check if on leave
    if (isEmployeeOnLeave(employee, dateStr)) {
        return false;
    }
    
    // Check restrictions
    if (employee.restrictions) {
        const restrictions = employee.restrictions;
        
        // Check weekend restriction
        if (restrictions.no_weekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
            return false;
        }
        
        // Check weekday restriction
        if (restrictions.no_weekdays && dayOfWeek >= 1 && dayOfWeek <= 5) {
            return false;
        }
        
        // Check specific day restrictions
        if (restrictions.no_specific_days && restrictions.no_specific_days.length > 0) {
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const currentDayName = dayNames[dayOfWeek];
            if (restrictions.no_specific_days.includes(currentDayName)) {
                return false;
            }
        }
    }
    
    return true;
}

function showWorkloadModal() {
    if (!employeeData || Object.keys(generatedSchedule).length === 0) {
        showMessage('กรุณาสร้างตารางเวรก่อน', 'error');
        return;
    }
    
    const workloadData = calculateActualWorkload();
    const realisticAverages = calculateRealisticAverages();
    const content = document.getElementById('workloadContent');
    
    // Calculate summary statistics
    const totalDays = Object.keys(generatedSchedule).length;
    const targetGroupCount = Object.keys(employeeData.groups).length;
    const expectedAssignments = totalDays * targetGroupCount;
    const actualAssignments = Object.values(generatedSchedule).reduce((sum, day) => sum + day.length, 0);
    
    // Count assignment types
    let normalAssignments = 0;
    let overrideAssignments = 0;
    let emergencyAssignments = 0;
    
    Object.values(generatedSchedule).forEach(dayAssignments => {
        dayAssignments.forEach(assignment => {
            switch (assignment.type) {
                case 'normal': normalAssignments++; break;
                case 'override_restriction': overrideAssignments++; break;
                case 'emergency': emergencyAssignments++; break;
            }
        });
    });
    
    let html = `
        <div class="workload-summary">
            <h3>📊 สรุปสถิติการจัดเวร</h3>
            <div class="employee-workload">
                <span>วันที่มีการจัดเวร</span>
                <span>${totalDays} วัน</span>
            </div>
            <div class="employee-workload">
                <span>การมอบหมายงานรวม</span>
                <span>${actualAssignments}/${expectedAssignments} ครั้ง (${((actualAssignments/expectedAssignments)*100).toFixed(1)}%)</span>
            </div>
            <div class="employee-workload">
                <span>✅ การมอบหมายปกติ</span>
                <span>${normalAssignments} ครั้ง</span>
            </div>
            <div class="employee-workload">
                <span>⚠️ เกินข้อจำกัด</span>
                <span>${overrideAssignments} ครั้ง</span>
            </div>
            <div class="employee-workload">
                <span>🚨 ฉุกเฉิน (ลาแต่มาทำงาน)</span>
                <span>${emergencyAssignments} ครั้ง</span>
            </div>
            <div class="employee-workload">
                <span>📈 ชั่วโมงเฉลี่ย Network (คำนึงวันลา)</span>
                <span>${Math.round(realisticAverages.network * 10) / 10} ชั่วโมง</span>
            </div>
            <div class="employee-workload">
                <span>📈 ชั่วโมงเฉลี่ย Lab (คำนึงวันลา)</span>
                <span>${Math.round(realisticAverages.lab * 10) / 10} ชั่วโมง</span>
            </div>
        </div>
        <div class="workload-summary">
    `;
    
    Object.keys(workloadData).forEach(groupName => {
        html += `<h3>กลุ่ม ${groupName}</h3>`;
        
        workloadData[groupName].forEach(emp => {
            let detailInfo = '';
            if (emp.overrideShifts > 0 || emp.emergencyShifts > 0) {
                detailInfo = ' (';
                if (emp.overrideShifts > 0) detailInfo += `⚠️${emp.overrideShifts}`;
                if (emp.emergencyShifts > 0) {
                    if (emp.overrideShifts > 0) detailInfo += ', ';
                    detailInfo += `🚨${emp.emergencyShifts}`;
                }
                detailInfo += ')';
            }
            
            // Calculate leave days
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            let leaveDays = 0;
            
            const originalEmp = employeeData.groups[groupName].find(e => e.name === emp.name);
            if (originalEmp && originalEmp.leavedays) {
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    if (originalEmp.leavedays.includes(dateStr)) {
                        leaveDays++;
                    }
                }
            }
            
            const leaveInfo = leaveDays > 0 ? ` | ลา ${leaveDays} วัน` : '';
            
            html += `
                <div class="employee-workload">
                    <span>${emp.name}</span>
                    <span>${emp.actualHours} ชั่วโมง (${emp.shifts} เวร${detailInfo}${leaveInfo})</span>
                </div>
            `;
        });
        
        html += '<br>';
    });
    
    html += '</div>';
    content.innerHTML = html;
    
    document.getElementById('workloadModal').style.display = 'block';
}

function calculateActualWorkload() {
    const workloadData = {};
    
    // Initialize workload data
    Object.keys(employeeData.groups).forEach(groupName => {
        workloadData[groupName] = employeeData.groups[groupName].map(emp => ({
            name: emp.name,
            actualHours: 0,
            shifts: 0,
            normalShifts: 0,
            overrideShifts: 0,
            emergencyShifts: 0
        }));
    });
    
    // Count actual assignments
    Object.values(generatedSchedule).forEach(dayAssignments => {
        dayAssignments.forEach(assignment => {
            const groupData = workloadData[assignment.group];
            const employee = groupData.find(emp => emp.name === assignment.name);
            if (employee) {
                employee.actualHours += assignment.hours;
                employee.shifts += 1;
                
                switch (assignment.type) {
                    case 'normal':
                        employee.normalShifts += 1;
                        break;
                    case 'override_restriction':
                        employee.overrideShifts += 1;
                        break;
                    case 'emergency':
                        employee.emergencyShifts += 1;
                        break;
                }
            }
        });
    });
    
    return workloadData;
}

function closeWorkloadModal() {
    document.getElementById('workloadModal').style.display = 'none';
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    generatedSchedule = {}; // Clear schedule when changing month
    updateCalendar();
    updateStats();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    generatedSchedule = {}; // Clear schedule when changing month
    updateCalendar();
    updateStats();
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    
    if (type === 'error') {
        messageDiv.className = 'error-message';
    } else if (type === 'warning') {
        messageDiv.className = 'warning-message';
    } else {
        messageDiv.className = 'success-message';
    }
    
    messageDiv.textContent = message;
    
    const controls = document.querySelector('.controls');
    controls.insertBefore(messageDiv, controls.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 8000); // Show warning messages longer
}

// Initialize the application
initializeApp();

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('workloadModal');
    if (event.target === modal) {
        closeWorkloadModal();
    }
}