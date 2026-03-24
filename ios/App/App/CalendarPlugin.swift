import Foundation
import Capacitor
import EventKit

@objc(CalendarPlugin)
public class CalendarPlugin: CAPPlugin {
    
    private let eventStore = EKEventStore()
    
    @objc func openICSFile(_ call: CAPPluginCall) {
        guard let content = call.getString("content") else {
            call.reject("Content is required")
            return
        }
        
        let fileName = call.getString("fileName") ?? "plan.ics"
        
        // 请求日历访问权限
        let status = EKEventStore.authorizationStatus(for: .event)
        
        if status == .authorized {
            self.importEvents(content: content, call: call, fileName: fileName)
        } else {
            eventStore.requestAccess(to: .event) { granted, error in
                if granted {
                    self.importEvents(content: content, call: call, fileName: fileName)
                } else {
                    call.reject("Calendar permission denied")
                }
            }
        }
    }
    
    private func importEvents(content: String, call: CAPPluginCall, fileName: String) {
        // 解析 ICS 内容并导入事件
        let events = parseICSContent(content)
        
        var successCount = 0
        var failCount = 0
        
        for eventData in events {
            do {
                try createEvent(from: eventData)
                successCount += 1
            } catch {
                failCount += 1
                print("Failed to create event: \(error)")
            }
        }
        
        if successCount > 0 {
            call.resolve([
                "success": true,
                "importedCount": successCount,
                "failedCount": failCount
            ])
        } else {
            call.reject("Failed to import any events")
        }
    }
    
    private func parseICSContent(_ content: String) -> [[String: String]] {
        var events: [[String: String]] = []
        var currentEvent: [String: String] = [:]
        var currentKey = ""
        
        let lines = content.components(separatedBy: "\r\n")
        
        for line in lines {
            if line == "BEGIN:VEVENT" {
                currentEvent = [:]
            } else if line == "END:VEVENT" {
                if !currentEvent.isEmpty {
                    events.append(currentEvent)
                }
                currentEvent = [:]
            } else if let colonIndex = line.firstIndex(of: ":") {
                let key = String(line[..<colonIndex])
                let value = String(line[line.index(after: colonIndex)...])
                
                if key == "SUMMARY" {
                    currentEvent["title"] = value
                } else if key == "DESCRIPTION" {
                    currentEvent["description"] = value.replacingOccurrences(of: "\\n", with: "\n")
                } else if key == "DTSTART" {
                    currentEvent["startDate"] = value
                } else if key == "DTEND" {
                    currentEvent["endDate"] = value
                }
            }
        }
        
        return events
    }
    
    private func createEvent(from data: [String: String]) throws {
        guard let title = data["title"],
              let startStr = data["startDate"],
              let endStr = data["endDate"] else {
            throw NSError(domain: "CalendarPlugin", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing required fields"])
        }
        
        let event = EKEvent(eventStore: eventStore)
        event.title = title
        event.calendar = eventStore.defaultCalendarForNewEvents
        event.notes = data["description"]
        
        // 解析日期
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
        dateFormatter.timeZone = TimeZone(identifier: "UTC")
        
        if let startDate = dateFormatter.date(from: startStr) {
            event.startDate = startDate
        }
        
        if let endDate = dateFormatter.date(from: endStr) {
            event.endDate = endDate
        }
        
        try eventStore.save(event, span: .thisEvent)
    }
}