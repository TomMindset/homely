import React, { useEffect } from "react";
import { Alert, Linking, SafeAreaView, ScrollView, StatusBar, View } from "react-native";
import { BottomNav } from "./src/components/BottomNav";
import { Header } from "./src/components/Header";
import { Hero } from "./src/components/Hero";
import { FamilyScreen } from "./src/screens/FamilyScreen";
import { FairnessScreen } from "./src/screens/FairnessScreen";
import { MealsScreen } from "./src/screens/MealsScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { TasksScreen } from "./src/screens/TasksScreen";
import { TodayScreen } from "./src/screens/TodayScreen";
import { WeekScreen } from "./src/screens/WeekScreen";
import { handleAuthRedirectUrl } from "./src/services/authService";
import { usePlannerState } from "./src/state/usePlannerState";
import { styles } from "./src/styles/plannerStyles";
import { getDesignSet } from "./src/constants/planner";
import { ThemeProvider } from "./src/theme/themeContext";

export default function App() {
  const planner = usePlannerState();
  const activeDesign = getDesignSet(planner.designSetId);
  const activePalette = planner.darkMode ? activeDesign.dark : activeDesign;
  const themedSurface = { backgroundColor: activePalette.background };
  const setView = planner.setView;

  useEffect(() => {
    let active = true;

    async function processUrl(url: string | null) {
      if (!url || !active) return;
      const result = await handleAuthRedirectUrl(url);
      if (!active || !result.message) return;
      Alert.alert(result.ok ? "Homely Konto" : "Homely Konto", result.message);
      if (result.ok) {
        setView("settings");
      }
    }

    Linking.getInitialURL().then(processUrl).catch(() => {});
    const subscription = Linking.addEventListener("url", (event) => {
      processUrl(event.url).catch(() => {});
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [setView]);

  if (!planner.onboardingComplete) {
    return (
      <ThemeProvider colors={activeDesign}>
        <SafeAreaView style={[styles.safeArea, planner.darkMode && styles.safeAreaDark, themedSurface]}>
          <StatusBar
            barStyle={planner.darkMode ? "light-content" : "dark-content"}
            backgroundColor={activePalette.background}
          />
          <View style={[styles.app, planner.darkMode && styles.appDark, themedSurface]}>
            <OnboardingScreen
              householdName={planner.familyName}
              darkMode={planner.darkMode}
              completeOnboarding={planner.completeOnboarding}
            />
          </View>
        </SafeAreaView>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider colors={activeDesign}>
      <SafeAreaView style={[styles.safeArea, planner.darkMode && styles.safeAreaDark, themedSurface]}>
      <StatusBar
        barStyle={planner.darkMode ? "light-content" : "dark-content"}
        backgroundColor={activePalette.background}
      />
      <View style={[styles.app, planner.darkMode && styles.appDark, themedSurface]}>
        <Header
          selectedWeek={planner.selectedWeek}
          setSelectedWeek={planner.setSelectedWeek}
          darkMode={planner.darkMode}
          jumpToday={() => {
            planner.setSelectedWeek(planner.current.week);
            planner.setSelectedDay(planner.currentDay);
            planner.setView("today");
          }}
        />
        <ScrollView contentContainerStyle={styles.content}>
          <Hero
            completion={planner.completion}
            familyName={planner.familyName}
            selectedWeek={planner.selectedWeek}
            selectedDay={planner.selectedDay}
            setSelectedDay={planner.setSelectedDay}
            selectedMemberId={planner.selectedMemberId}
            setSelectedMemberId={planner.setSelectedMemberId}
            activeMemberId={planner.activeMemberId}
            setActiveMemberId={planner.selectActiveMember}
            founderMemberId={planner.founderMemberId}
            canManagePlan={planner.canManagePlan}
            members={planner.members}
            syncStatus={planner.syncStatus}
            refreshRemoteSnapshot={planner.refreshRemoteSnapshot}
            darkMode={planner.darkMode}
          />
          {planner.view === "today" && (
            <TodayScreen
              assignments={planner.selectedDayAssignments}
              meal={planner.selectedMeal}
              tasks={planner.tasks}
              members={planner.members}
              darkMode={planner.darkMode}
              activeMemberId={planner.activeMemberId}
              toggleAssignment={planner.toggleAssignment}
            />
          )}
          {planner.view === "week" && (
            <WeekScreen
              assignments={planner.assignments}
              tasks={planner.tasks}
              members={planner.members}
              darkMode={planner.darkMode}
              selectedWeek={planner.selectedWeek}
              activeMemberId={planner.activeMemberId}
            />
          )}
          {planner.view === "fairness" && (
            <FairnessScreen
              assignments={planner.weekAssignments}
              tasks={planner.tasks}
              members={planner.members}
              darkMode={planner.darkMode}
              canManagePlan={planner.canManagePlan}
              selectedWeek={planner.selectedWeek}
              updateAssignmentMember={planner.updateAssignmentMember}
            />
          )}
          {planner.view === "meals" && (
            <MealsScreen
              meals={planner.meals}
              members={planner.members}
              selectedWeek={planner.selectedWeek}
              darkMode={planner.darkMode}
              canManagePlan={planner.canManagePlan}
              updateMeal={planner.updateMeal}
            />
          )}
          {planner.view === "tasks" && (
            <TasksScreen
              tasks={planner.tasks}
              darkMode={planner.darkMode}
              newTitle={planner.newTitle}
              setNewTitle={planner.setNewTitle}
              newUnits={planner.newUnits}
              setNewUnits={planner.setNewUnits}
              newScheduleType={planner.newScheduleType}
              setNewScheduleType={planner.setNewScheduleType}
              newTaskDays={planner.newTaskDays}
              toggleNewTaskDay={planner.toggleNewTaskDay}
              newReminderOptionId={planner.newReminderOptionId}
              setNewReminderOptionId={planner.setNewReminderOptionId}
              newReminderTime={planner.newReminderTime}
              setNewReminderTime={planner.setNewReminderTime}
              canManagePlan={planner.canManagePlan}
              addTask={planner.addTask}
              updateTask={planner.updateTask}
              deleteTask={planner.deleteTask}
              restoreDefaultTasks={planner.restoreDefaultTasks}
              hiddenDefaultTaskCount={planner.hiddenDefaultTaskCount}
              assignments={planner.weekAssignments}
              members={planner.members}
              selectedWeek={planner.selectedWeek}
              updateAssignmentMember={planner.updateAssignmentMember}
            />
          )}
          {planner.view === "family" && (
            <FamilyScreen
              familyName={planner.familyName}
              members={planner.members}
              darkMode={planner.darkMode}
              canManagePlan={planner.canManagePlan}
              updateFamilyName={planner.updateFamilyName}
              addMember={planner.addMember}
              updateMember={planner.updateMember}
              deleteMember={planner.deleteMember}
              resetLocalData={planner.resetLocalData}
            />
          )}
          {planner.view === "settings" && (
            <SettingsScreen
              accountEmail={planner.accountEmail}
              activeMemberName={planner.activeMember?.name ?? ""}
              familyName={planner.familyName}
              members={planner.members}
              tasks={planner.tasks}
              assignments={planner.assignments}
              meals={planner.meals}
              activeRemoteHouseholdId={planner.activeRemoteHouseholdId}
              syncStatus={planner.syncStatus}
              darkMode={planner.darkMode}
              designSetId={planner.designSetId}
              canManagePlan={planner.canManagePlan}
              applyRemoteSnapshot={planner.applyRemoteSnapshot}
              setActiveRemoteHouseholdId={planner.setActiveRemoteHouseholdId}
              setView={planner.setView}
              updateAccountEmail={planner.updateAccountEmail}
              toggleDarkMode={planner.toggleDarkMode}
              setDesignSetId={planner.setDesignSetId}
              updateFamilyName={planner.updateFamilyName}
              addMember={planner.addMember}
              updateMember={planner.updateMember}
              deleteMember={planner.deleteMember}
              resetLocalData={planner.resetLocalData}
            />
          )}
        </ScrollView>
        <BottomNav view={planner.view} setView={planner.setView} darkMode={planner.darkMode} />
      </View>
    </SafeAreaView>
    </ThemeProvider>
  );
}
