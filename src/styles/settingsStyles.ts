import { StyleSheet } from 'react-native';

export const settingsStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#faf5ff',
    },
    content: {
        padding: 16,
        paddingBottom: 28,
        gap: 14,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1a1a1a',
    },
    subtitle: {
        marginTop: 4,
        fontSize: 13,
        color: '#7a5e6e',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#f0d7eb',
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#30202a',
        marginBottom: 6,
    },
    sectionText: {
        fontSize: 13,
        color: '#6f5a66',
        lineHeight: 19,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    statBox: {
        flex: 1,
        borderRadius: 14,
        backgroundColor: '#fff7fb',
        borderWidth: 1,
        borderColor: '#f3dbe7',
        padding: 12,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1f1f1f',
    },
    statLabel: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '700',
        color: '#8a6a7c',
    },
    actionButton: {
        minHeight: 50,
        borderRadius: 14,
        backgroundColor: '#e91e63',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
    },
    actionButtonSecondary: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f0c9dc',
    },
    actionButtonDanger: {
        backgroundColor: '#c0392b',
    },
    actionButtonDisabled: {
        opacity: 0.7,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
    actionButtonTextSecondary: {
        color: '#a24770',
    },
    hintText: {
        marginTop: 10,
        fontSize: 12,
        color: '#7a5e6e',
        lineHeight: 18,
    },
});