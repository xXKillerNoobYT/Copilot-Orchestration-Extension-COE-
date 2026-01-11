# LLM IP Monitor - Production Test Plan

## Test Execution: January 10, 2026

### Test Environment
- **Branch**: feature/design-components-phase3
- **Build Status**: ✅ Compilation successful (0 errors)
- **Location**: VS Code Extension

---

## Test Cases

### 1. Extension Activation ✅
**Objective**: Verify monitor starts on extension activation

**Steps**:
1. Open VS Code with the extension
2. Check status bar for LLM monitor indicator
3. Verify initial status shows "checking" or "healthy"

**Expected Result**:
- Status bar shows: `$(circle-filled) LLM: OK (192.168.137.215:8000)` or `$(loading~spin) LLM: Checking...`
- No errors in Output channel

**Status**: 

---

### 2. Initial Connectivity Check
**Objective**: Test initial LLM service detection

**Steps**:
1. Ensure LLM service is running at default IP (192.168.137.215:8000)
2. Wait 5 seconds for initial check
3. Click status bar item to view details

**Expected Result**:
- Status: ✅ Healthy
- Last Checked: Recent timestamp
- Current IP displayed correctly

**Status**: 

---

### 3. Service Unreachable Detection
**Objective**: Verify monitor detects when LLM is offline

**Steps**:
1. Stop LLM service
2. Wait 30-35 seconds for next check
3. Check status bar

**Expected Result**:
- Status bar shows: `$(error) LLM: Unreachable`
- Status bar color: Red (#ff6b6b)
- Fallback recovery attempt logged

**Status**: 

---

### 4. Auto-Recovery - Default IP
**Objective**: Test fallback to default IP

**Steps**:
1. Start LLM at default IP (192.168.137.215:8000)
2. Change monitor config to wrong IP
3. Wait for auto-recovery

**Expected Result**:
- Monitor automatically detects default IP
- Status returns to healthy
- User notification: "LLM service recovered at 192.168.137.215"

**Status**: 

---

### 5. Manual IP Configuration
**Objective**: Test manual IP update via UI

**Steps**:
1. Click status bar → "Configure"
2. Enter new IP address
3. Verify immediate re-check

**Expected Result**:
- Input dialog appears with current IP pre-filled
- New IP saved to config
- Connectivity re-checked immediately
- Notification confirms update

**Status**: 

---

### 6. Status Details View
**Objective**: Verify detailed status information display

**Steps**:
1. Click status bar item
2. Review information shown

**Expected Result**:
Shows:
- Current IP
- Port
- Status (Healthy/Unreachable)
- Last Checked timestamp
- Last Known IP

**Status**: 

---

### 7. Output Channel Logging
**Objective**: Verify diagnostic logs

**Steps**:
1. Open Output channel: "LLM Monitor"
2. Trigger connectivity check
3. Review log entries

**Expected Result**:
Logs show:
- `[timestamp] 🚀 LLM IP Monitor started`
- `[timestamp] ✅ LLM is healthy at 192.168.137.215:8000`
- Or error messages with recovery attempts

**Status**: 

---

### 8. Network Discovery
**Objective**: Test automatic network scan

**Steps**:
1. Move LLM to different IP in 192.168.137.200-220 range
2. Set monitor to wrong IP
3. Let auto-recovery scan network

**Expected Result**:
- Monitor scans IPs in range
- Discovers LLM at new IP
- Updates config automatically
- Shows notification

**Status**: 

---

### 9. Extension Deactivation
**Objective**: Verify clean shutdown

**Steps**:
1. Deactivate/reload extension
2. Check for cleanup

**Expected Result**:
- Status bar item hidden
- Interval timer cleared
- Log shows: `🛑 LLM IP Monitor stopped`
- No memory leaks

**Status**: 

---

### 10. Performance & Resource Usage
**Objective**: Verify minimal performance impact

**Metrics**:
- Check interval: 30 seconds ✓
- Timeout per check: 5 seconds ✓
- Network scan: Max 20 IPs = ~60 seconds worst case
- Memory: Minimal (single interval, small config object)

**Expected Result**:
- No noticeable CPU usage between checks
- Quick response on user interaction
- No freezing or blocking

**Status**: 

---

## Production Readiness Checklist

- [ ] All test cases pass
- [ ] No compilation errors
- [ ] No runtime errors in console
- [ ] Status bar updates correctly
- [ ] User notifications work
- [ ] Configuration persists across reloads
- [ ] Clean shutdown on deactivation
- [ ] Minimal resource usage
- [ ] Documentation complete

---

## Notes

*Add observations, issues, or improvements here*

