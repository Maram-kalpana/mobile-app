import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../contexts/AuthContext';
import { AppTextField } from '../../components/AppTextField';

import {
  changePassword,
  getProfile,
  updateProfileImage,
} from '../../api/authApi';

export function ProfileScreen({ navigation }) {

  const { user, logout, updateUser } = useAuth();

  const insets = useSafeAreaInsets();

  const [photoUri, setPhotoUri] = useState(null);

  const [profileLoading, setProfileLoading] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  const [oldPassword, setOldPassword] = useState('');

  const [newPassword, setNewPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const closePasswordModal = useCallback(() => {

    setPasswordModalVisible(false);

    setOldPassword('');

    setNewPassword('');

    setConfirmPassword('');

    setPasswordSubmitting(false);

  }, []);

  // PROFILE FETCH
  useFocusEffect(
    useCallback(() => {

      let cancelled = false;

      (async () => {

        try {

          setProfileLoading(true);

          const res = await getProfile();

          if (cancelled) return;

          const data = res?.data?.data ?? res?.data ?? {};

          console.log("PROFILE RESPONSE");
          console.log(data);
if (data?.name || data?.email) {

  const newPhoto =
    data.photo ?? data.profile_photo ?? null;

  // prevent unnecessary updates
  if (
    user?.name !== data.name ||
    user?.email !== data.email ||
    user?.photo !== newPhoto
  ) {

    updateUser({
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      username: data.username ?? data.id,
      photo: newPhoto,
    });
  }

  if (newPhoto && photoUri !== newPhoto) {
    setPhotoUri(newPhoto);
  }
}
        } catch (err) {

          console.log("PROFILE FETCH ERROR");
          console.log(err?.response?.data || err?.message);

        } finally {

          if (!cancelled) {
            setProfileLoading(false);
          }
          
        }

      })();

      return () => {
        cancelled = true;
      };

    }, [updateUser, user, photoUri])
  );

  // CHANGE PASSWORD
  const submitPasswordChange = useCallback(async () => {

    if (!oldPassword.trim()) {
      Alert.alert('Required', 'Please enter your current password.');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Required', 'Please enter new password.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Invalid', 'Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    if (oldPassword === newPassword) {
      Alert.alert(
        'Invalid',
        'New password must be different from current password.'
      );
      return;
    }

    setPasswordSubmitting(true);

    try {

      const payload = {
  current_password: oldPassword,
  new_password: newPassword,
  confirm_password: confirmPassword,
};

      console.log("CHANGE PASSWORD PAYLOAD");
      console.log(payload);

      const res = await changePassword(payload);

      console.log("PASSWORD SUCCESS RESPONSE");
      console.log(res?.data);

      Alert.alert(
        'Success',
        'Password updated successfully.'
      );

      closePasswordModal();

    } catch (err) {

      console.log("FULL PASSWORD ERROR");
      console.log(JSON.stringify(err?.response?.data, null, 2));

      Alert.alert(
        'Error',
        JSON.stringify(
          err?.response?.data ||
          err?.message ||
          'Password update failed',
          null,
          2
        )
      );

    } finally {

      setPasswordSubmitting(false);

    }

  }, [
    oldPassword,
    newPassword,
    confirmPassword,
    closePasswordModal,
  ]);

  React.useLayoutEffect(() => {
    navigation?.setOptions?.({ headerShown: false });
  }, [navigation]);

  // IMAGE PICKER
  const pickPhoto = async () => {

    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {

      Alert.alert(
        'Permission needed',
        'Please allow access to your photo library.'
      );

      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({

        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,

        allowsEditing: true,

        aspect: [1, 1],

        quality: 0.8,
      });

    if (!result.canceled) {

      const uri = result.assets[0].uri;

      setPhotoUri(uri);

      try {

        setUploadingPhoto(true);

        const formData = new FormData();

        const filename =
          uri.split('/').pop() || 'profile.jpg';

        const match =
          /\.(\w+)$/.exec(filename);

        const type =
          match
            ? `image/${match[1]}`
            : 'image/jpeg';

        formData.append('image', {
          uri,
          name: filename,
          type,
        });

        console.log("UPLOAD IMAGE STARTED");

        const res = await updateProfileImage(formData);

        console.log("UPLOAD IMAGE RESPONSE");
        console.log(res?.data);

        const photoUrl =
          res?.data?.data?.photo ??
          res?.data?.photo ??
          res?.data?.image ??
          null;

        if (photoUrl) {

          updateUser({
            photo: photoUrl,
          });
        }

        Alert.alert(
          'Success',
          'Profile photo updated.'
        );

      } catch (err) {

        console.log("UPLOAD PHOTO ERROR");
        console.log(err?.response?.data || err);

        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to upload photo.';

        Alert.alert('Error', String(msg));

      } finally {

        setUploadingPhoto(false);
      }
    }
  };

  const Row = ({
    icon,
    label,
    value,
    onPress,
    isAction,
  }) => (

    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >

      <View style={styles.rowIcon}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color="#4A90E2"
        />
      </View>

      <View style={{ flex: 1 }}>

        <Text style={styles.rowLabel}>
          {label}
        </Text>

        {value ? (
          <Text style={styles.rowValue}>
            {value}
          </Text>
        ) : null}

      </View>

      {isAction && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color="#ccc"
        />
      )}

    </TouchableOpacity>
  );

  return (

    <SafeAreaView
      style={styles.root}
      edges={['top']}
    >

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
      >

        <LinearGradient
          colors={['#4A90E2', '#2c5f9e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() =>
              navigation?.goBack?.()
            }
          >

            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color="#fff"
            />

            <Text style={styles.backText}>
              Profile
            </Text>

          </TouchableOpacity>

          <View style={styles.avatarArea}>

            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={pickPhoto}
              activeOpacity={0.85}
              disabled={uploadingPhoto}
            >

              {uploadingPhoto || profileLoading ? (

                <View
                  style={[
                    styles.avatarPlaceholder,
                    styles.avatarLoader,
                  ]}
                >

                  <ActivityIndicator
                    size="large"
                    color="#fff"
                  />

                </View>

              ) : photoUri ? (

                <Image
                  source={{ uri: photoUri }}
                  style={styles.avatarImg}
                />

              ) : user?.photo ? (

                <Image
                  source={{ uri: user.photo }}
                  style={styles.avatarImg}
                />

              ) : (

                <View style={styles.avatarPlaceholder}>

                  <MaterialCommunityIcons
                    name="account-hard-hat"
                    size={40}
                    color="#4A90E2"
                  />

                </View>
              )}

              <View style={styles.cameraBadge}>

                <MaterialCommunityIcons
                  name="camera"
                  size={13}
                  color="#fff"
                />

              </View>

            </TouchableOpacity>

          </View>

        </LinearGradient>

        <View style={styles.nameBlock}>

          <Text style={styles.name}>
            {user?.name ?? 'Site Manager'}
          </Text>

          <Text style={styles.roleText}>
            {user?.role === 'manager'
              ? 'Site Manager'
              : user?.role ?? ''}
          </Text>

        </View>

        <Text style={styles.sectionLabel}>
          ACCOUNT INFO
        </Text>

        <View style={styles.section}>

          <Row
            icon="account-outline"
            label="Name"
            value={user?.name ?? 'Site Manager'}
          />

          <View style={styles.divider} />

          <Row
            icon="badge-account-outline"
            label="User ID"
            value={
              user?.username ??
              user?.id ??
              '—'
            }
          />

        </View>

        <Text style={styles.sectionLabel}>
          SECURITY
        </Text>

        <View style={styles.section}>

          <Row
            icon="lock-reset"
            label="Change Password"
            isAction
            onPress={() =>
              setPasswordModalVisible(true)
            }
          />

        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => logout()}
        >

          <MaterialCommunityIcons
            name="logout"
            size={20}
            color="#fff"
          />

          <Text style={styles.logoutText}>
            Logout
          </Text>

        </TouchableOpacity>

        <View style={{ height: 30 }} />

      </ScrollView>

      {/* PASSWORD MODAL */}

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closePasswordModal}
      >

        <View style={styles.modalRoot}>

          <Pressable
            style={styles.modalBackdrop}
            onPress={closePasswordModal}
          />

          <KeyboardAvoidingView
            behavior={
              Platform.OS === 'ios'
                ? 'padding'
                : undefined
            }
            style={styles.modalSheetWrap}
            keyboardVerticalOffset={
              Platform.OS === 'ios'
                ? 8
                : 0
            }
          >

            <View
              style={[
                styles.modalCard,
                {
                  paddingBottom:
                    Math.max(
                      insets.bottom,
                      16
                    ) + 8,
                },
              ]}
            >

              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>
                Change password
              </Text>

              <Text style={styles.modalSub}>
                Enter your current password,
                then choose a new one.
              </Text>

              {/* CURRENT PASSWORD */}

              <View style={{ position: 'relative' }}>

                <AppTextField
                  label="Current password"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry={
                    !showCurrentPassword
                  }
                  autoCapitalize="none"
                  placeholder="••••••••"
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowCurrentPassword(
                      !showCurrentPassword
                    )
                  }
                  style={styles.eyeIcon}
                >

                  <MaterialCommunityIcons
                    name={
                      showCurrentPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={22}
                    color="#94a3b8"
                  />

                </TouchableOpacity>

              </View>

              {/* NEW PASSWORD */}

              <View style={{ position: 'relative' }}>

                <AppTextField
                  label="New password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={
                    !showNewPassword
                  }
                  autoCapitalize="none"
                  placeholder="At least 6 characters"
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowNewPassword(
                      !showNewPassword
                    )
                  }
                  style={styles.eyeIcon}
                >

                  <MaterialCommunityIcons
                    name={
                      showNewPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={22}
                    color="#94a3b8"
                  />

                </TouchableOpacity>

              </View>

              {/* CONFIRM PASSWORD */}

              <View style={{ position: 'relative' }}>

                <AppTextField
                  label="Confirm new password"
                  value={confirmPassword}
                  onChangeText={
                    setConfirmPassword
                  }
                  secureTextEntry={
                    !showConfirmPassword
                  }
                  autoCapitalize="none"
                  placeholder="Re-enter new password"
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  style={styles.eyeIcon}
                >

                  <MaterialCommunityIcons
                    name={
                      showConfirmPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={22}
                    color="#94a3b8"
                  />

                </TouchableOpacity>

              </View>

              <View style={styles.modalActions}>

                <TouchableOpacity
                  style={styles.modalBtnSecondary}
                  onPress={closePasswordModal}
                  disabled={passwordSubmitting}
                >

                  <Text
                    style={
                      styles.modalBtnSecondaryText
                    }
                  >
                    Cancel
                  </Text>

                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalBtnPrimary,
                    passwordSubmitting &&
                      styles.modalBtnDisabled,
                  ]}
                  onPress={submitPasswordChange}
                  disabled={passwordSubmitting}
                >

                  {passwordSubmitting ? (

                    <ActivityIndicator
                      color="#fff"
                    />

                  ) : (

                    <Text
                      style={
                        styles.modalBtnPrimaryText
                      }
                    >
                      Update
                    </Text>
                  )}

                </TouchableOpacity>

              </View>

            </View>

          </KeyboardAvoidingView>

        </View>

      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },

  hero: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 50,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },

  backText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  avatarArea: {
    alignItems: 'center',
    marginTop: 16,
  },

  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'visible',

    ...(Platform.OS === 'web'
      ? {
          boxShadow:
            '0px 4px 14px rgba(0,0,0,0.2)',
        }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: {
            width: 0,
            height: 4,
          },
          elevation: 6,
        }),
  },

  avatarImg: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },

  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#eaf4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarLoader: {
    backgroundColor: '#4A90E2',
  },

  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  nameBlock: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 20,
  },

  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2f4b',
  },

  roleText: {
    fontSize: 13,
    color: '#8a99b5',
    marginTop: 3,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9baabb',
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#eaf4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9baabb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2f4b',
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#f0f4fa',
    marginLeft: 66,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ef4444',
  },

  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },

  modalSheetWrap: {
    width: '100%',
    maxHeight: '92%',
  },

  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 14,
  },

  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 8,
    width: '100%',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2f4b',
    marginBottom: 6,
  },

  modalSub: {
    fontSize: 13,
    color: '#8a99b5',
    marginBottom: 16,
    lineHeight: 18,
  },

  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 42,
    zIndex: 10,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  modalBtnSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },

  modalBtnPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },

  modalBtnDisabled: {
    opacity: 0.7,
  },

});