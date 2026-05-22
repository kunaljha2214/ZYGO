import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScroll } from '../../components/layout/StackScroll';
import { GlassCard } from '../../components/neon/GlassCard';
import { ProfileDetailRow } from '../../components/profile/ProfileDetailRow';
import { DobPickerSheet } from '../../components/profile/DobPickerSheet';
import { AppTextInput } from '../../components/AppTextInput';
import { Button } from '../../components/Button';
import { AppAlert } from '../../alert';
import {
  fetchUserProfile,
  updateUserProfile,
  type UserProfileDetails,
} from '../../api/userProfile';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';
import { parseBirthDateString } from '../../utils/dateOfBirth';

type EditKind = 'name' | 'emergency' | null;

function formatPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `+91 ${d}`;
  return phone;
}

export function ProfileDetailsScreen() {
  const patchUser = useAuthStore((s) => s.patchUser);
  const [profile, setProfile] = useState<UserProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editKind, setEditKind] = useState<EditKind>(null);
  const [dobPickerOpen, setDobPickerOpen] = useState(false);
  const [dobInitial, setDobInitial] = useState(() => parseBirthDateString(null));
  const [editName, setEditName] = useState('');
  const [editEcName, setEditEcName] = useState('');
  const [editEcPhone, setEditEcPhone] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    void fetchUserProfile()
      .then(setProfile)
      .catch((e) =>
        AppAlert.alert('Error', e instanceof Error ? e.message : 'Could not load profile')
      )
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openEdit(kind: EditKind) {
    if (!profile) return;
    if (kind === 'name') {
      setEditName(profile.name);
    } else if (kind === 'emergency') {
      setEditEcName(profile.emergencyContact?.name ?? '');
      setEditEcPhone(profile.emergencyContact?.phone ?? '');
    }
    setEditKind(kind);
  }

  function openDobPicker() {
    if (!profile) return;
    setDobInitial(parseBirthDateString(profile.dateOfBirth));
    setDobPickerOpen(true);
  }

  async function saveDob(apiValue: string) {
    setSaving(true);
    try {
      const updated = await updateUserProfile({ dateOfBirth: apiValue });
      setProfile(updated);
      setDobPickerOpen(false);
    } catch (e) {
      AppAlert.alert('Save failed', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editKind) return;
    setSaving(true);
    try {
      let body: Parameters<typeof updateUserProfile>[0] = {};
      if (editKind === 'name') {
        const name = editName.trim();
        if (name.length < 2) {
          AppAlert.alert('Name', 'Enter at least 2 characters');
          return;
        }
        body = { name };
      } else if (editKind === 'emergency') {
        const name = editEcName.trim();
        const phone = editEcPhone.replace(/\D/g, '');
        if (!name || phone.length !== 10) {
          AppAlert.alert('Emergency contact', 'Enter name and a 10-digit phone number');
          return;
        }
        body = { emergencyContact: { name, phone } };
      }
      const updated = await updateUserProfile(body);
      setProfile(updated);
      if (body.name) {
        await patchUser({ name: updated.name });
      }
      setEditKind(null);
    } catch (e) {
      AppAlert.alert('Save failed', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <StackScroll>
        <Button title="Retry" onPress={load} />
      </StackScroll>
    );
  }

  const ecDisplay = profile.emergencyContact
    ? `${profile.emergencyContact.name} · ${formatPhoneDisplay(profile.emergencyContact.phone)}`
    : null;

  const canEditDob = !profile.dateOfBirthLocked;

  return (
    <>
      <StackScroll>
        <GlassCard style={styles.card} noPadding>
          <ProfileDetailRow
            icon="👤"
            label="Name"
            value={profile.name}
            editable
            onPress={() => openEdit('name')}
          />
          <ProfileDetailRow
            icon="📞"
            label="Phone Number"
            value={formatPhoneDisplay(profile.phone)}
          />
          <ProfileDetailRow icon="✉️" label="Email" value={profile.email ?? '—'} />
          <ProfileDetailRow
            icon="📅"
            label="Date of Birth"
            value={profile.dateOfBirth}
            required={!profile.dateOfBirth}
            editable={canEditDob}
            onPress={canEditDob ? openDobPicker : undefined}
          />
          <ProfileDetailRow
            icon="🏅"
            label="Member Since"
            value={profile.memberSince}
          />
          <ProfileDetailRow
            icon="🚨"
            label="Emergency contact"
            value={ecDisplay}
            required={!profile.emergencyContact}
            editable
            actionLabel={profile.emergencyContact ? undefined : 'Add'}
            onPress={() => openEdit('emergency')}
            isLast
          />
        </GlassCard>
        <Text style={styles.hint}>
          Phone and email are tied to your account and cannot be changed here. Date of birth can
          only be set once.
        </Text>
      </StackScroll>

      <DobPickerSheet
        visible={dobPickerOpen}
        initialDate={dobInitial}
        saving={saving}
        onCancel={() => !saving && setDobPickerOpen(false)}
        onSave={(apiValue) => void saveDob(apiValue)}
      />

      <Modal visible={editKind != null} animationType="slide" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => !saving && setEditKind(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {editKind === 'name' ? 'Edit name' : 'Emergency contact'}
            </Text>
            {editKind === 'name' ? (
              <AppTextInput
                label="Full name"
                value={editName}
                onChangeText={setEditName}
                autoCapitalize="words"
              />
            ) : null}
            {editKind === 'emergency' ? (
              <>
                <AppTextInput
                  label="Contact name"
                  value={editEcName}
                  onChangeText={setEditEcName}
                  autoCapitalize="words"
                />
                <AppTextInput
                  label="Contact phone"
                  value={editEcPhone}
                  onChangeText={setEditEcPhone}
                  keyboardType="phone-pad"
                  placeholder="10-digit mobile"
                />
              </>
            ) : null}
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setEditKind(null)}
                disabled={saving}
              />
              <Button title="Save" onPress={() => void saveEdit()} loading={saving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  card: { marginBottom: 12 },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
