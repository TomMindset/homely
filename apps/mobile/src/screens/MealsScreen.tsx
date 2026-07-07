import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { days } from "../constants/planner";
import { seedData } from "../data/seedData";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";
import { MealPlanEntry, Member, getWeekMeals } from "../utils/planner";

export function MealsScreen({
  meals,
  members,
  selectedWeek,
  darkMode,
  canManagePlan,
  updateMeal,
}: {
  meals: MealPlanEntry[];
  members: Member[];
  selectedWeek: number;
  darkMode: boolean;
  canManagePlan: boolean;
  updateMeal: (mealId: string, title: string, cookMemberId?: string | null) => void;
}) {
  const [mode, setMode] = useState<"week" | "longterm">("week");
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [longtermEditId, setLongtermEditId] = useState<string | null>(null);
  const [longtermTitle, setLongtermTitle] = useState("");
  const [longtermCookMemberId, setLongtermCookMemberId] = useState<string | null>(null);
  const weekMeals = getWeekMeals(meals, seedData.family.year, selectedWeek);
  const swapSource = meals.find((meal) => meal.id === swapSourceId);
  const longtermEditMeal = meals.find((meal) => meal.id === longtermEditId);
  const longtermWeeks = seedData.family.availableWeeks
    .filter((week) => week >= selectedWeek)
    .slice(0, 12)
    .map((week) => ({
      week,
      meals: getWeekMeals(meals, seedData.family.year, week),
    }));
  const themed = useThemeStyles(darkMode);

  function swapMeal(target: MealPlanEntry) {
    if (!canManagePlan) return;
    if (!swapSource || swapSource.id === target.id) {
      setSwapSourceId(swapSource?.id === target.id ? null : target.id);
      return;
    }

    updateMeal(swapSource.id, target.title, target.cookMemberId ?? null);
    updateMeal(target.id, swapSource.title, swapSource.cookMemberId ?? null);
    setSwapSourceId(null);
  }

  function openLongtermMeal(meal: MealPlanEntry) {
    if (!canManagePlan) return;
    if (swapSource) {
      swapMeal(meal);
      return;
    }
    setLongtermEditId(meal.id);
    setLongtermTitle(meal.title || "");
    setLongtermCookMemberId(meal.cookMemberId ?? null);
  }

  function saveLongtermMeal() {
    if (!longtermEditMeal) return;
    updateMeal(longtermEditMeal.id, longtermTitle, longtermCookMemberId);
    setLongtermEditId(null);
  }

  function startLongtermSwap() {
    if (!longtermEditMeal) return;
    setSwapSourceId(longtermEditMeal.id);
    setLongtermEditId(null);
  }

  return (
    <View style={[styles.section, darkMode && styles.sectionDark, themed.section]}>
      <Text style={[styles.eyebrow, themed.muted]}>Essensplan</Text>
      <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>KW {selectedWeek}</Text>
      {!canManagePlan && <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>Nur Gruender und Verwalter koennen den Essensplan bearbeiten.</Text>}
      {canManagePlan && swapSource && (
        <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>
          Tauschen aktiv: Waehle ein Ziel fuer {swapSource.day} KW {swapSource.week}.
        </Text>
      )}
      <View style={styles.segmented}>
        {[
          { id: "week", label: "Woche" },
          { id: "longterm", label: "Langfristig" },
        ].map((item) => {
          const active = mode === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.segmentButton, themed.buttonSurface, active && themed.active]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} im Essensplan anzeigen`}
              accessibilityState={{ selected: active }}
              onPress={() => setMode(item.id as "week" | "longterm")}
            >
              <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === "longterm" && longtermEditMeal && (
        <View style={[styles.mealEditorRow, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>
            {longtermEditMeal.day} KW {longtermEditMeal.week}
          </Text>
          <TextInput
            style={[styles.input, styles.mealInput, themed.input, darkMode && styles.inputDark]}
            value={longtermTitle}
            onChangeText={setLongtermTitle}
            accessibilityLabel={`Gericht fuer ${longtermEditMeal.day} KW ${longtermEditMeal.week}`}
            placeholder="Gericht eintragen"
            placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
          />
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Kocht</Text>
          <View style={styles.memberPreviewGrid}>
            <TouchableOpacity
              style={[styles.memberPreviewChip, darkMode && styles.rowDark, themed.card, longtermCookMemberId === null && themed.active]}
              accessibilityRole="button"
              accessibilityLabel="Keine kochende Person zuordnen"
              accessibilityState={{ selected: longtermCookMemberId === null }}
              onPress={() => setLongtermCookMemberId(null)}
            >
              <Text style={[styles.taskMeta, themed.muted, longtermCookMemberId === null && styles.segmentButtonTextActive]}>Offen</Text>
            </TouchableOpacity>
            {members.map((member) => {
              const active = longtermCookMemberId === member.id;
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.memberPreviewChip, darkMode && styles.rowDark, themed.card, active && themed.active]}
                  accessibilityRole="button"
                  accessibilityLabel={`${member.name} kocht ${longtermEditMeal.day}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => setLongtermCookMemberId(member.id)}
                >
                  <View style={[styles.dot, { backgroundColor: member.color }]} />
                  <Text style={[styles.taskMeta, themed.muted, active && styles.segmentButtonTextActive]}>{member.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.editorActions}>
            <TouchableOpacity style={[styles.secondaryAction, themed.soft]} accessibilityRole="button" accessibilityLabel="Tausch starten" onPress={startLongtermSwap}>
              <Text style={[styles.secondaryActionText, themed.muted]}>Tauschen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryAction, themed.soft]} accessibilityRole="button" accessibilityLabel="Bearbeitung abbrechen" onPress={() => setLongtermEditId(null)}>
              <Text style={[styles.secondaryActionText, themed.muted]}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.primaryAction, themed.primary]} accessibilityRole="button" accessibilityLabel="Gericht speichern" onPress={saveLongtermMeal}>
            <Text style={styles.primaryActionText}>Speichern</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === "week" &&
        weekMeals.map((meal) => (
          <MealEditor
            key={meal.id}
            meal={meal}
            members={members}
            darkMode={darkMode}
            canManagePlan={canManagePlan}
            updateMeal={updateMeal}
            swapSelected={swapSourceId === meal.id}
            onSwapPress={() => swapMeal(meal)}
          />
        ))}

      {mode === "longterm" &&
        longtermWeeks.map((week) => (
          <View key={week.week} style={[styles.longtermMealWeek, darkMode && styles.rowDark, themed.card]}>
            <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>KW {week.week}</Text>
            <View style={styles.longtermMealGrid}>
              {days.map((day) => {
                const meal = week.meals.find((item) => item.day === day);
                const active = !!meal && swapSourceId === meal.id;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.longtermMealCell, themed.soft, active && styles.mealRowSelected]}
                    disabled={!canManagePlan || !meal}
                    accessibilityRole="button"
                    accessibilityLabel={meal ? `${meal.day} KW ${meal.week}: ${meal.title || "offen"}` : `${day} ohne Eintrag`}
                    accessibilityHint="Im Tauschmodus als Ziel auswaehlen"
                    accessibilityState={{ selected: active, disabled: !canManagePlan || !meal }}
                    onPress={() => meal && openLongtermMeal(meal)}
                  >
                    <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{day.slice(0, 2)}</Text>
                    <Text style={[styles.longtermMealTitle, themed.text, darkMode && styles.textDark]} numberOfLines={2}>
                      {meal?.title || "offen"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
    </View>
  );
}

function MealEditor({
  meal,
  members,
  darkMode,
  canManagePlan,
  updateMeal,
  swapSelected,
  onSwapPress,
}: {
  meal: MealPlanEntry;
  members: Member[];
  darkMode: boolean;
  canManagePlan: boolean;
  updateMeal: (mealId: string, title: string, cookMemberId?: string | null) => void;
  swapSelected: boolean;
  onSwapPress: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(meal.title || "");
  const [cookMemberId, setCookMemberId] = useState<string | null>(meal.cookMemberId ?? null);
  const themed = useThemeStyles(darkMode);
  const cookMember = members.find((member) => member.id === meal.cookMemberId);

  useEffect(() => {
    if (!editing) {
      setTitle(meal.title || "");
      setCookMemberId(meal.cookMemberId ?? null);
    }
  }, [editing, meal.cookMemberId, meal.title]);

  function save() {
    updateMeal(meal.id, title, cookMemberId);
    setEditing(false);
  }

  if (editing) {
    return (
      <View style={[styles.mealEditorRow, darkMode && styles.rowDark]}>
        <Text style={[styles.mealDay, themed.muted, darkMode && styles.mutedDark]}>{meal.day}</Text>
        <TextInput
          style={[styles.input, styles.mealInput, themed.input, darkMode && styles.inputDark]}
          value={title}
          onChangeText={setTitle}
          accessibilityLabel={`Gericht fuer ${meal.day}`}
          placeholder="Gericht eintragen"
          placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
        />
        <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Kocht</Text>
        <View style={styles.memberPreviewGrid}>
          <TouchableOpacity
            style={[styles.memberPreviewChip, darkMode && styles.rowDark, themed.card, cookMemberId === null && themed.active]}
            accessibilityRole="button"
            accessibilityLabel="Keine kochende Person zuordnen"
            accessibilityState={{ selected: cookMemberId === null }}
            onPress={() => setCookMemberId(null)}
          >
            <Text style={[styles.taskMeta, themed.muted, cookMemberId === null && styles.segmentButtonTextActive]}>Offen</Text>
          </TouchableOpacity>
          {members.map((member) => {
            const active = cookMemberId === member.id;
            return (
              <TouchableOpacity
                key={member.id}
                style={[styles.memberPreviewChip, darkMode && styles.rowDark, themed.card, active && themed.active]}
                accessibilityRole="button"
                accessibilityLabel={`${member.name} kocht ${meal.day}`}
                accessibilityState={{ selected: active }}
                onPress={() => setCookMemberId(member.id)}
              >
                <View style={[styles.dot, { backgroundColor: member.color }]} />
                <Text style={[styles.taskMeta, themed.muted, active && styles.segmentButtonTextActive]}>{member.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.editorActions}>
          <TouchableOpacity style={[styles.secondaryAction, themed.soft]} accessibilityRole="button" accessibilityLabel="Bearbeitung abbrechen" onPress={() => setEditing(false)}>
            <Text style={[styles.secondaryActionText, themed.muted]}>Abbrechen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryActionInline, themed.primary]} accessibilityRole="button" accessibilityLabel="Gericht speichern" onPress={save}>
            <Text style={styles.primaryActionText}>Speichern</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mealRow, swapSelected && themed.soft, swapSelected && styles.mealRowSelected]}>
      <View style={styles.mealInfoRow}>
        <Text style={[styles.mealDay, themed.muted, darkMode && styles.mutedDark]}>{meal.day}</Text>
        <View style={styles.taskTextBox}>
          <Text style={[styles.mealName, themed.text, darkMode && styles.textDark]}>{meal.title || "Noch offen"}</Text>
          {!!cookMember && (
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Kocht: {cookMember.name}</Text>
          )}
        </View>
      </View>
      {canManagePlan && (
        <View style={styles.mealActions}>
          <TouchableOpacity style={[styles.editButton, { borderColor: themed.theme.primary }]} accessibilityRole="button" accessibilityLabel={`${meal.day} tauschen`} onPress={onSwapPress}>
            <Text style={[styles.editButtonText, { color: themed.theme.primary }]}>{swapSelected ? "Ziel waehlen" : "Tauschen"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.editButton, { borderColor: themed.theme.primary }]} accessibilityRole="button" accessibilityLabel={`${meal.day} bearbeiten`} onPress={() => setEditing(true)}>
            <Text style={[styles.editButtonText, { color: themed.theme.primary }]}>Bearbeiten</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
